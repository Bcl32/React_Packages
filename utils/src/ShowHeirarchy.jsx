import { AnimatedFileSystem } from "@bcl32/utils/AnimatedFileSystem";

function jsonToTree(obj) {
  const result = [];

  for (const key in obj) {
    if (obj.hasOwnProperty(key)) {
      const node = { name: key };
      if (typeof obj[key] === "object") {
        node.nodes = jsonToTree(obj[key]);
      } else {
        // node.nodes = [{ name: obj[key] }];
        node.nodes = [];
        node.value = obj[key];
      }
      result.push(node);
    }
  }

  return result;
}

export function ShowHeirarchy({ json_data }) {
  const treeData = jsonToTree(json_data);

  return (
    <div>
      <ul>
        {treeData.map((node) => (
          <AnimatedFileSystem node={node} key={node.name} />
        ))}
      </ul>
    </div>
  );
}
