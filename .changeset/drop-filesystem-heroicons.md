---
"@bcl32/utils": minor
---

Remove the `FileSystem` component and the `@heroicons/react` dependency.

`FileSystem.tsx` was a non-animated duplicate of `AnimatedFileSystem.tsx` —
same purpose, different icon set, no shared abstraction. Only
`AnimatedFileSystem` is wrapped by `ShowHierarchy`, and nothing imported the
plain one. It was the sole consumer of `@heroicons/react`, for three icons
(`ChevronRightIcon`, `DocumentIcon`, `FolderIcon`) that `AnimatedFileSystem`
already imports from `lucide-react` as `ChevronRight`, `File` and `Folder`.

Dropping the dependency removes **20.8 MB** from every consumer's deps image,
builder stage and CI pull.

Released as a **minor** despite removing the public `./FileSystem` subpath.
Nothing imports it: no file in Print-Tracker, Security-Benchmarks, Base-POC or
Label-Designer references `FileSystem`, `FilesystemItem` or `FileSystemNode`,
and no app imports `@bcl32/utils` as a barrel — every consumer uses subpath
imports. A major would have invalidated the `workspace:^2.x` range in seven
sibling packages (`charts`, `command-palette`, `datatable`, `filters`, `forms`,
`navigation`, `themes`), causing npm to nest duplicate `utils` copies — which
the consumers' `Dockerfile.deps` dedupe gate fails the build on.
