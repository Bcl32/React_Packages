---
"@bcl32/forms": minor
---

New EditableStringList component: inline click-to-edit bullet list for
array-of-strings fields (ModelData type "list"). Click a row to edit in
place, ghost row appends, Enter chains into the next item, committing empty
deletes the row; commits PATCH the whole array via onSave({ field: string[] }).
