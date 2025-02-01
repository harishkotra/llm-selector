import { Check, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState } from "react";

export default function CopyInput({ value, className = "" }) {
  const [copied, setCopied] = useState(false);

  const onCopy = async () => {
    if (!navigator.clipboard) return;
    
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy text:", err);
    }
  };

  return (
    <div className={`relative flex items-center ${className}`}>
      <Input 
        type="text" 
        value={value} 
        readOnly 
        className="pr-20"
      />
      <Button
        size="sm"
        variant="ghost"
        className="absolute right-0 h-full px-3 py-2 hover:bg-transparent"
        onClick={onCopy}
      >
        {copied ? (
          <Check className="h-4 w-4 text-green-500" />
        ) : (
          <Copy className="h-4 w-4 text-gray-500" />
        )}
      </Button>
    </div>
  );
}