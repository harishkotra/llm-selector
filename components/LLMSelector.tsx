'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from "@/components/ui/input";
import { useToast } from '../hooks/use-toast';
import { Loader, Info } from 'lucide-react'; // Import Info icon
import CopyInput from './CopyInput';
import ModelCommandDisplay from './ModelCommandDisplay';
import OpenAI from 'openai';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"; // Import Dialog for modal
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
  } from "@/components/ui/select";

interface ModelConfig {
  id: string;
  name: string;
  configJson: any;
  requirements: {
    memory: number;
    disk: number;
    gpu: string;
  };
  useCase: string[];
  performance: number;
  generatedRequirements?: string;
  generatedUseCases?: string[];
}

const client = new OpenAI({
  baseURL: 'https://llama8b.gaia.domains/v1',
  apiKey: 'GAIA',
  dangerouslyAllowBrowser: true,
});

export const LLMSelector = () => {
  const [models, setModels] = useState<ModelConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [systemInfo, setSystemInfo] = useState<{
    memory: number | 'unknown';
    cores: number | 'unknown';
    gpu: string;
  } | null>(null);
  const { toast } = useToast();
  const [selectedModel, setSelectedModel] = useState<ModelConfig | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [filter, setFilter] = useState<string>('all'); 

  const callGaiaAPI = async (modelTitle: string) => {
    try {
      const prompt = `Generate detailed requirements and use cases for the model titled "${modelTitle}".`;

      const response = await client.chat.completions.create({
        model: "llama",
        messages: [
          { role: "system", content: "You are a helpful assistant that generates detailed requirements and use cases for AI models." },
          { role: "user", content: prompt },
        ],
      });

      if (!response.choices || response.choices.length === 0) {
        throw new Error('No response from OpenAI');
      }

      return response.choices[0].message.content;
    } catch (error) {
      console.error('Error calling OpenAI API:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to generate content from OpenAI API",
      });
      return null;
    }
  };

  const generateRequirementsAndUseCases = async (model: ModelConfig) => {
    const requirementsPrompt = `Generate a detailed description of the requirements for the model ${model.name}.`;
    const useCasesPrompt = `Generate a list of use cases for the model ${model.name}.`;

    const generatedRequirements = await callGaiaAPI(requirementsPrompt);
    const generatedUseCases = await callGaiaAPI(useCasesPrompt);
    console.log(generatedRequirements);

    return {
      ...model,
      generatedRequirements,
      generatedUseCases: generatedUseCases ? generatedUseCases.split('\n') : [],
    };
  };

  const handleInfoClick = async (model: ModelConfig) => {
    setSelectedModel(model);
    setIsModalOpen(true);
    console.log('selected model: ', model);
    // Generate requirements and use cases
      const updatedModel = await generateRequirementsAndUseCases(model);
      setSelectedModel(updatedModel);
      setModels((prevModels) =>
        prevModels.map((m) => (m.id === updatedModel.id ? updatedModel : m))
      );
  };

  // Group models by their name prefix (e.g., "Llama", "Qwen")
  const groupedModels = models.reduce((acc, model) => {
    const prefix = model.name.split(' ')[0]; // Extract the first word as the group name
    if (!acc[prefix]) {
      acc[prefix] = [];
    }
    acc[prefix].push(model);
    return acc;
  }, {} as Record<string, ModelConfig[]>);

  // Get unique group names for the filter
  const groupNames = Object.keys(groupedModels);

  useEffect(() => {
    // Detect system capabilities
    const detectSystem = () => {
      const info = {
        memory: (navigator as any).deviceMemory || 'unknown',
        cores: navigator.hardwareConcurrency || 'unknown',
        gpu: 'detecting...',
      };

      // Check for WebGL to detect GPU capabilities
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
      if (gl) {
        const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
        info.gpu = debugInfo ? gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) : 'unknown';
      } else {
        info.gpu = 'not available';
      }

      setSystemInfo(info);
    };

    // Fetch model configurations from generated JSON file
    const fetchModels = async () => {
      try {
        const response = await fetch('/model-configs.json');
        if (!response.ok) {
          throw new Error('Failed to fetch model configurations');
        }
        const data: ModelConfig[] = await response.json();
        setModels(data);
      } catch (error) {
        console.error('Error fetching model configs:', error);
        toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to load model configurations",
        });
      } finally {
        setLoading(false);
      }
    };

    detectSystem();
    fetchModels();
  }, [toast]);

  const getRecommendedModels = () => {
    if (!systemInfo) return [];

    return models.filter((model) => {
      // Simple recommendation logic based on system capabilities
      const memoryOK = systemInfo.memory === 'unknown' || systemInfo.memory >= model.requirements.memory;
      const gpuOK = model.requirements.gpu === 'Optional' || (model.requirements.gpu === 'Required' && systemInfo.gpu !== 'not available');
      return memoryOK && gpuOK;
    });
  };

  const getConfigUrl = (model: ModelConfig) => {
    return `https://github.com/GaiaNet-AI/node-configs/tree/main/${model.id}/config.json`;
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4">
      <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-4">
        <Card className="mb-8">
            <CardHeader>
                <CardTitle>💪 LLM Selector</CardTitle>
                <CardDescription></CardDescription>
            </CardHeader>
            <CardContent>
                <div className="grid grid-cols-1 gap-4">
                    <div>
                    <p className="text-sm font-medium">This tool helps you choose the best Large Language Model (LLM) for your needs. It analyzes your system's hardware capabilities and recommends a selection of LLMs that are compatible and perform well on your machine.</p>
                    </div>
                </div>

            </CardContent>
        </Card>
        <Card className="mb-8">
            <CardHeader>
                <CardTitle>🔥 Features</CardTitle>
                <CardDescription></CardDescription>
                </CardHeader>
            <CardContent>
                <div className="grid grid-cols-1 gap-4">
                    <div>
                        <ul className='text-sm'>
                            <li><strong>Identifies compatible models:</strong> The tool assesses your system's memory, CPU cores, and GPU to recommend LLMs that will run smoothly.</li>
                            <li><strong>Provides performance scores:</strong> It displays performance scores for each LLM, indicating how well they are likely to perform on your system.</li>
                            <li><strong>Offers a variety of options:</strong> It includes a range of LLMs with different strengths and weaknesses, allowing you to choose the one that best suits your specific requirements.</li>
                            <li><strong>Easy to use:</strong> The user interface is simple and intuitive, making it easy to navigate and select the right LLM.
                            </li>
                        </ul>
                    </div>
                </div>
            </CardContent>
        </Card>
        <Card className="mb-8">
            <CardHeader>
                <CardTitle>🤞🏼 Important</CardTitle>
                <CardDescription></CardDescription>
                </CardHeader>
            <CardContent>
                <div className="grid grid-cols-1 gap-4">
                    <ul>
                        <li>The tool is constantly updated with new LLMs and performance data.</li>
                        <li>It is important to consider your specific use case and requirements when selecting an LLM.</li>
                        <li>The tool can be used as a starting point, and further research may be needed to make the best decision.</li>
                    </ul>
                </div>
            </CardContent>
        </Card>
        <Card className="mb-8">
            <CardHeader>
            <CardTitle>⚙️ Your machine</CardTitle>
            <CardDescription>Here's your machine's hardware capabilities</CardDescription>
            </CardHeader>
            <CardContent>
            <div className="grid grid-cols-1 gap-4">
                <div>
                <p className="text-sm font-medium">Memory</p>
                <p className="text-2xl">{systemInfo?.memory} {systemInfo?.memory !== 'unknown' ? 'GB' : ''}</p>
                </div>
                <div>
                <p className="text-sm font-medium">CPU Cores</p>
                <p className="text-2xl">{systemInfo?.cores}</p>
                </div>
                <div>
                <p className="text-sm font-medium">GPU</p>
                <p className="text-2xl text-sm">{systemInfo?.gpu}</p>
                </div>
            </div>
            </CardContent>
        </Card>
      </div>
      <Tabs defaultValue="recommended" className="space-y-4">
        {/* <TabsList>
          <TabsTrigger value="recommended">Recommended</TabsTrigger>
          <TabsTrigger value="all">All Models</TabsTrigger>
        </TabsList> */}
        {/* Filter Dropdown */}
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by model" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            {groupNames.map((group) => (
              <SelectItem key={group} value={group}>
                {group}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <TabsContent value="recommended">
          <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-4">
            {getRecommendedModels()
              .filter((model) => filter === 'all' || model.name.startsWith(filter))
              .map((model) => (
                <Card key={model.id}>
                  <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                        <CardTitle>{model.name}</CardTitle>
                        <CardDescription>
                        Based on {model.configJson.prompt_template || 'standard'} template
                        </CardDescription>
                    </div>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleInfoClick(model)}
                    >
                        <Info className="h-4 w-4" />
                    </Button>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div>
                        <p className="text-sm font-medium mb-2">Performance Score</p>
                        <Progress value={model.performance} />
                      </div>
                      <div>
                        <ModelCommandDisplay modelId={model.id} className="mt-4" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
          </div>
        </TabsContent>
      </Tabs>

      {/* Modal for Requirements and Use Cases */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{selectedModel?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <p className="text-sm font-medium mb-2">Requirements</p>
              <p className="text-sm">{selectedModel?.generatedRequirements || 'Loading...'}</p>
            </div>
            <div>
              <p className="text-sm font-medium mb-2">Use Cases</p>
              <div className="flex flex-wrap gap-2">
                {selectedModel?.generatedUseCases ? (
                  selectedModel.generatedUseCases.map((use, index) => (
                    <Badge key={index} variant="secondary">
                      {use}
                    </Badge>
                  ))
                ) : (
                  <Badge variant="secondary">Loading...</Badge>
                )}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};