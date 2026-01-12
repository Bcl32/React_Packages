import { ChevronRight } from "lucide-react";
import { File, Folder } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { useState } from "react";

export function AnimatedFileSystem({ node }) {
  let [isOpen, setIsOpen] = useState(false);

  return (
    <li key={node.name}>
      <span
        className="flex items-center gap-1.5 py-1"
        onClick={() => setIsOpen(!isOpen)}
      >
        {node.nodes && node.nodes.length > 0 && (
          <button className="p-1 -m-1">
            <motion.span
              animate={{ rotate: isOpen ? 90 : 0 }}
              transition={{ type: "spring", bounce: 0, duration: 0.4 }}
              className="flex"
            >
              <ChevronRight className="size-4 text-gray-500" />
            </motion.span>
          </button>
        )}
        {node.nodes ? (
          <Folder
            className={`size-6 text-primary ${
              node.nodes.length === 0 ? "ml-[22px]" : ""
            }`}
          />
        ) : (
          <File className="ml-[22px] size-6 text-gray-900" />
        )}
        <span className="font-bold">{node.name}</span>: {node.value}
      </span>

      <AnimatePresence>
        {isOpen && (
          <motion.ul
            initial={{ height: 0 }}
            animate={{ height: "auto" }}
            exit={{ height: 0 }}
            transition={{ type: "spring", bounce: 0, duration: 0.4 }}
            className="pl-6 overflow-hidden flex flex-col justify-end"
          >
            {node.nodes?.map((node) => (
              <AnimatedFileSystem node={node} key={node.name} />
            ))}
          </motion.ul>
        )}
      </AnimatePresence>
    </li>
  );
}
