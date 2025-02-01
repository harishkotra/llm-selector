import { Check, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState } from "react";

export default function ModelCommandDisplay({ modelId, className = "" }) {
  const [copied, setCopied] = useState(false);
  
  // Generate the init command for the specific model
  const getInitCommand = (modelId: string) => {
    return `gaianet init --config https://raw.githubusercontent.com/GaiaNet-AI/node-configs/main/${modelId}/config.json`;
  };

  const command = getInitCommand(modelId);

  const onCopy = async () => {
    if (!navigator.clipboard) return;
    
    try {
      await navigator.clipboard.writeText(command);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy command:", err);
    }
  };

  return (
    <div className={`relative flex flex-col gap-2 ${className}`}>
      <div className="text-sm font-medium">Initialize Command:</div>
      <div className="relative flex items-center w-full">
        <Input 
          type="text" 
          value={command} 
          readOnly 
          className="pr-20 font-mono text-sm"
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
    </div>
  );
}