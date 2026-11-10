"""Renders the app's OpenAPI schema as a readable Markdown reference."""

from app.api.docs import TAGS

METHODS = ["get", "post", "put", "patch", "delete"]


def _resolve(spec: dict, schema: dict) -> dict:
    if "$ref" in schema:
        return spec["components"]["schemas"][schema["$ref"].split("/")[-1]]
    return schema


def _type(schema: dict) -> str:
    if "$ref" in schema:
        name = schema["$ref"].split("/")[-1]
        return f"[{name}](#{name.lower()})"
    if "anyOf" in schema:
        return " or ".join(_type(s) for s in schema["anyOf"])
    if "enum" in schema:
        return " / ".join(f"`{v}`" for v in schema["enum"])
    kind = schema.get("type", "any")
    if kind == "array":
        return f"{_type(schema.get('items', {}))}[]"
    return f"{kind} ({schema['format']})" if "format" in schema else kind


def _notes(schema: dict) -> str:
    notes = [schema["description"].rstrip(".")] if schema.get("description") else []
    skip_length = schema.get("format") == "uri"  # url fields carry a meaningless minLength
    for key, label in (("minLength", "min length"), ("maxLength", "max length"), ("minimum", "min"),
                       ("maximum", "max"), ("exclusiveMinimum", "greater than")):
        if key in schema and not (skip_length and key == "minLength"):
            notes.append(f"{label} {schema[key]}")
    if "pattern" in schema:
        notes.append(f"pattern `{schema['pattern']}`")
    if "default" in schema and schema["default"] is not None:
        notes.append(f"default `{schema['default']}`")
    return "; ".join(notes)


def _table(rows: list[tuple]) -> list[str]:
    lines = ["| Name | Type | Required | Notes |", "|---|---|---|---|"]
    lines += [f"| `{n}` | {t} | {'yes' if r else 'no'} | {d} |" for n, t, r, d in rows]
    return lines + [""]


def _fields(spec: dict, schema: dict) -> list[tuple]:
    schema = _resolve(spec, schema)
    required = set(schema.get("required", []))
    return [(n, _type(p), n in required, _notes(p)) for n, p in schema.get("properties", {}).items()]


def render(spec: dict) -> str:
    out = [f"# {spec['info']['title']} API", "", spec["info"].get("description", "").strip(), "",
           "Interactive version: `/docs` (Swagger UI) or `/redoc`. Raw schema: `/openapi.json`.",
           "_This file is generated: run `make docs` after changing the API._", ""]

    by_tag: dict[str, list] = {}
    for path, ops in spec["paths"].items():
        for method in METHODS:
            if method in ops:
                by_tag.setdefault(ops[method]["tags"][0], []).append((path, method, ops[method]))

    for tag in TAGS:
        if tag["name"] not in by_tag:
            continue
        out += [f"## {tag['name']}", "", tag["description"], ""]
        for path, method, op in by_tag[tag["name"]]:
            lock = " 🔒" if op.get("security") else ""
            out += [f"### `{method.upper()} {path}`{lock}", "", f"**{op['summary']}**", ""]
            if op.get("description"):
                out += [op["description"], ""]

            for where, title in (("path", "Path parameters"), ("query", "Query parameters")):
                params = [p for p in op.get("parameters", []) if p["in"] == where]
                if params:
                    out += [f"{title}:", ""]
                    out += _table([(p["name"], _type(p["schema"]), p.get("required", False),
                                    _notes({**p["schema"], "description": p.get("description")})) for p in params])

            body = op.get("requestBody", {}).get("content", {}).get("application/json")
            if body:
                out += ["JSON body:", ""] + _table(_fields(spec, body["schema"]))

            codes = []
            for code, resp in op["responses"].items():
                content = resp.get("content", {}).get("application/json", {}).get("schema")
                if code.startswith("2") and content and "$ref" in content:
                    codes.append(f"`{code}` {_type(content)}")
                elif code.startswith("2"):
                    codes.append(f"`{code}` {resp.get('description', '')}".strip())
                elif code != "422":
                    codes.append(f"`{code}` {resp['description']}")
                else:
                    codes.append("`422` validation error")
            out += ["Responses: " + " · ".join(codes), ""]

    out += ["## Schemas", ""]
    for name, schema in sorted(spec["components"]["schemas"].items()):
        if name in ("HTTPValidationError", "ValidationError") or "properties" not in schema:
            continue
        out += [f'<a id="{name.lower()}"></a>', f"### {name}", ""] + _table(_fields(spec, schema))
    return "\n".join(out).rstrip("\n") + "\n"
