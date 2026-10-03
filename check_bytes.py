content = open('backend/app/modules/feed.py', 'rb').read()
target = b'if draft and draft.kind=='
idx = content.find(target)
print('found at byte:', idx)
print('surrounding:', repr(content[max(0,idx-5):idx+80]))
