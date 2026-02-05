import { AnimatedFileSystem, type AnimatedFileNode } from "./AnimatedFileSystem";

interface TreeNode extends AnimatedFileNode {
  name: string;
  value?: string | number;
  nodes?: TreeNode[];
}

function jsonToTree(obj: Record<string, unknown>): TreeNode[] {
  const result: TreeNode[] = [];

  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      const node: TreeNode = { name: key };
      const value = obj[key];
      if (typeof value === "object" && value !== null) {
        node.nodes = jsonToTree(value as Record<string, unknown>);
      } else {
        node.nodes = [];
        node.value = value as string | number;
      }
      result.push(node);
    }
  }

  return result;
}

interface ShowHeirarchyProps {
  json_data: Record<string, unknown>;
}

export function ShowHeirarchy({ json_data }: ShowHeirarchyProps) {
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
