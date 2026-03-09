/**
 * Read a File object as text, returning a Promise<string>.
 * Used for both drag-and-drop and file input imports.
 */
export function readFgaFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsText(file);
  });
}
