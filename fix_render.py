import re

with open("d:/SIH1063_/src/app/explore/page.tsx", "r", encoding="utf-8") as f:
    content = f.read()

# Add file_key to ImageHit
content = content.replace(
    "thumb_key?: string | null;",
    "thumb_key?: string | null;\n  file_key?: string | null;"
)

# Update the rendering logic
old_render = "{photo.thumb_key ? <img src={photo.thumb_key} alt={photo.title} className=\"h-full w-full object-cover\" /> : <div className=\"grid h-full place-items-center text-slate-400\"><ImageIcon className=\"h-8 w-8\" /></div>}"
new_render = "{photo.thumb_key ? <img src={photo.thumb_key} alt={photo.title} className=\"h-full w-full object-cover\" /> : photo.file_key ? <img src={`/api/storage/${photo.file_key}`} alt={photo.title} className=\"h-full w-full object-cover\" /> : <div className=\"grid h-full place-items-center text-slate-400\"><ImageIcon className=\"h-8 w-8\" /></div>}"

content = content.replace(old_render, new_render)

with open("d:/SIH1063_/src/app/explore/page.tsx", "w", encoding="utf-8") as f:
    f.write(content)
