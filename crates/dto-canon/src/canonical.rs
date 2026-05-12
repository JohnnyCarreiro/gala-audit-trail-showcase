//! Canonical JSON serialization — alphabetical keys (recursively), no
//! whitespace. Byte-equivalent to `@gala-chain/api`'s signing input.
//!
//! # How this matches the TS side
//!
//! The chaincode uses [`json-stringify-deterministic`] which sorts keys
//! alphabetically at every level and emits compact JSON. `serde_json`'s
//! default `Map<String, Value>` is a `BTreeMap` (sorted lexicographically
//! by string), and `serde_json::to_vec(&value)` emits compact output by
//! default. So a `serde_json::Value` parsed from any JSON input will
//! serialize back with keys in canonical order — no manual sort needed.
//!
//! **Critical assumption**: this crate is compiled without
//! `serde_json/preserve_order`. Enabling that feature swaps the BTreeMap
//! for an IndexMap and silently breaks canonical equivalence. The
//! workspace `Cargo.toml` does not enable it; if a downstream crate
//! turns it on, the failure mode is "signatures verify against a
//! different byte sequence than the chaincode signed." Pinning a
//! round-trip golden vector against the TS output in `tests/` is the
//! load-bearing check.
//!
//! [`json-stringify-deterministic`]: https://www.npmjs.com/package/json-stringify-deterministic

use crate::error::DtoCanonError;
use serde_json::Value;

/// Fields stripped from a DTO before computing its signing input. Mirrors
/// `@gala-chain/api`'s `getPayloadToSign` behavior: the `signature`
/// itself can't be part of what it signs, and `trace` is debug telemetry
/// not part of the payload contract.
///
/// Kept as a constant so it's discoverable from a single place when
/// validating against the TS source (e.g., when resolving
/// [`OQ-02`](../../../../docs/open-questions.md)).
pub const SIGNING_STRIPPED_FIELDS: &[&str] = &["signature", "trace"];

/// Canonical JSON serialization. Preserves all fields; recursive
/// alphabetical key sort and no whitespace.
pub fn canonicalize(value: &Value) -> Result<Vec<u8>, DtoCanonError> {
    serde_json::to_vec(value).map_err(DtoCanonError::from)
}

/// Canonical signing input — same as [`canonicalize`] but with the
/// fields in [`SIGNING_STRIPPED_FIELDS`] removed from the **top level**
/// of the object. Mirrors what `@gala-chain/api` hashes before signing.
///
/// Returns the canonical bytes of the cloned-and-stripped value, leaving
/// the input untouched.
pub fn canonicalize_for_signing(value: &Value) -> Result<Vec<u8>, DtoCanonError> {
    match value {
        Value::Object(map) => {
            let mut stripped = serde_json::Map::new();
            for (k, v) in map.iter() {
                if !SIGNING_STRIPPED_FIELDS.contains(&k.as_str()) {
                    stripped.insert(k.clone(), v.clone());
                }
            }
            canonicalize(&Value::Object(stripped))
        }
        // Non-object inputs pass through unchanged. Useful for hashing
        // primitive values (e.g., the prevHash chain links over an event
        // already in domain shape).
        _ => canonicalize(value),
    }
}

#[cfg(test)]
#[allow(clippy::unwrap_used)]
mod tests {
    use super::*;
    use serde_json::json;

    #[test]
    fn keys_sorted_alphabetically_at_top_level() {
        let v = json!({"c": 3, "a": 1, "b": 2});
        let bytes = canonicalize(&v).unwrap();
        assert_eq!(bytes, br#"{"a":1,"b":2,"c":3}"#);
    }

    #[test]
    fn keys_sorted_recursively_inside_nested_objects() {
        let v = json!({
            "outer_z": {"z_inner": 1, "a_inner": 2},
            "outer_a": {"y": 9, "x": 8},
        });
        let bytes = canonicalize(&v).unwrap();
        assert_eq!(
            bytes,
            br#"{"outer_a":{"x":8,"y":9},"outer_z":{"a_inner":2,"z_inner":1}}"#
        );
    }

    #[test]
    fn arrays_preserve_element_order() {
        // Arrays are positional — their order is semantic and must NOT be
        // touched. Only object keys get sorted.
        let v = json!([3, 1, 2, {"b": 1, "a": 2}]);
        let bytes = canonicalize(&v).unwrap();
        assert_eq!(bytes, br#"[3,1,2,{"a":2,"b":1}]"#);
    }

    #[test]
    fn no_whitespace_emitted() {
        let v = json!({"a": [1, 2, 3], "b": {"c": "hello"}});
        let bytes = canonicalize(&v).unwrap();
        let s = std::str::from_utf8(&bytes).unwrap();
        assert!(!s.contains(' '));
        assert!(!s.contains('\n'));
        assert!(!s.contains('\t'));
    }

    #[test]
    fn signing_strips_signature_and_trace_at_top_level_only() {
        let v = json!({
            "payload": {"signature": "kept-because-nested"},
            "signature": "should-be-stripped",
            "trace": "should-also-be-stripped",
            "sessionId": "abc",
        });
        let bytes = canonicalize_for_signing(&v).unwrap();
        let s = std::str::from_utf8(&bytes).unwrap();
        assert!(!s.contains("should-be-stripped"));
        assert!(!s.contains("should-also-be-stripped"));
        assert!(s.contains("kept-because-nested"));
        assert!(s.contains("\"sessionId\":\"abc\""));
    }
}
