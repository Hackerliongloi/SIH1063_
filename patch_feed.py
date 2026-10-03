content = open('backend/app/modules/feed.py', 'rb').read()

old = (
    b'        if draft and draft.kind=="reel":\r\n'
    b'            draft_states={"submit":"in_review","approve":"approved","request_changes":"changes_requested","reject":"rejected","schedule":"scheduled","publish":"published","unpublish":"approved","archive":"archived"}\r\n'
    b'            draft.status=draft_states[action];draft.updated_at=now()\r\n'
    b'            if action in {"approve","request_changes","reject"}:draft.reviewer_id=u.id\r\n'
    b'            if action=="approve":draft.approved_at=now()\r\n'
    b'            if action=="publish":draft.published_at=now()\r\n'
    b'            if action=="unpublish":draft.published_at=None;draft.scheduled_at=None\r\n'
)

new = (
    b'        if draft and draft.kind in {"reel","post","carousel"}:\r\n'
    b'            draft_states={"submit":"in_review","approve":"approved","request_changes":"changes_requested","reject":"rejected","schedule":"scheduled","publish":"published","unpublish":"approved","archive":"archived"}\r\n'
    b'            draft.status=draft_states[action];draft.updated_at=now()\r\n'
    b'            if action in {"approve","request_changes","reject"}:draft.reviewer_id=u.id\r\n'
    b'            if action=="approve":draft.approved_at=now()\r\n'
    b'            if action=="publish":draft.published_at=now()\r\n'
    b'            if action in {"unpublish","unschedule"}:draft.published_at=None;draft.scheduled_at=None\r\n'
)

assert old in content, "OLD PATTERN NOT FOUND"
updated = content.replace(old, new, 1)
assert updated != content, "No change made"
open('backend/app/modules/feed.py', 'wb').write(updated)
print("Done. Replaced", len(old), "bytes with", len(new), "bytes.")
