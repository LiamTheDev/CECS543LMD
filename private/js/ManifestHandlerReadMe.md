- Create a manifest object and write it into a json file
- in the repo folder.
-
- ROOT: databae/username/reponame/
-
- General form of manifest object
- - id: store id of this manifest
- - command: store the command attached with this manifest
- - user: user name
- - repo: repo name
- - date: date and time of the command
- - structure: an array of objects, each contains
-      "[leaf folder]/artifact" : absolute path to the artifact
-
- Ex: The structure for path: /liam/foo/bar.txt/artifact1.txt
- "bar.txt/artifact1.txt" : "/liam/foo/bar.txt/artifact1.txt"
-
- Ex: The structure for path: /liam/foo/baz/bar.txt/artifact3.txt
- "bar.txt/artifact1.txt" : "/liam/foo/bar.txt/artifact1.txt"
-
-
- For master_manifest.json
- General Form:
- "manifest_lists": {
-      "id1" : "manifest path"
-      "id2" : "manifest path"
-          ...
- }
- labels: {} // contains all labels mapping to a particular manifest

-
- With:
- - id: auto increment. Higher number = newer manifest.
- - manifest path: the path to each manifest of this repo.