import { exec as execCallback } from 'child_process';
import * as fs from 'fs/promises';
import * as path from 'path';
import { promisify } from 'util';

const exec = promisify(execCallback);

const REPO_URL = 'https://github.com/GaiaNet-AI/node-configs.git';
const CLONE_DIR = path.join(process.cwd(), 'data/node-configs');
const OUTPUT_FILE = path.join(process.cwd(), 'public/model-configs.json');

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
}

async function cloneRepo(): Promise<void> {
  try {
    // Remove existing directory if it exists
    await fs.rm(CLONE_DIR, { recursive: true, force: true }).catch(() => {});
    
    // Create data directory if it doesn't exist
    await fs.mkdir(path.dirname(CLONE_DIR), { recursive: true });
    
    // Clone the repository
    const { stdout } = await exec(`git clone ${REPO_URL} ${CLONE_DIR}`);
    console.log('Clone output:', stdout);
  } catch (error) {
    console.error('Failed to clone repository:', error);
    throw error;
  }
}

async function processModelConfigs(): Promise<void> {
  const modelConfigs: ModelConfig[] = [];

  try {
    // Get all directories
    const dirs = await fs.readdir(CLONE_DIR, { withFileTypes: true });
    
    // Process each directory that might contain a config.json
    for (const dir of dirs) {
      if (dir.isDirectory() && !dir.name.startsWith('.')) {
        const configPath = path.join(CLONE_DIR, dir.name, 'config.json');
        try {
          const configContent = await fs.readFile(configPath, 'utf-8');
          const configJson = JSON.parse(configContent);
          
          // Analyze model capabilities based on name and config
          const modelSize = dir.name.match(/\d+b/)?.[0] || '';
          const performance = modelSize.includes('70b') ? 90 :
                            modelSize.includes('27b') ? 85 :
                            modelSize.includes('13b') ? 80 :
                            modelSize.includes('8b') ? 75 : 70;

          const useCases = [
            ...(dir.name.includes('instruct') ? ['Instruction following'] : []),
            ...(dir.name.includes('chat') ? ['Chat'] : []),
            ...(dir.name.includes('code') ? ['Code generation'] : []),
            ...(dir.name.includes('chemistry') ? ['Chemistry'] : [])
          ];

          modelConfigs.push({
            id: dir.name,
            name: dir.name.replace(/-/g, ' '),
            configJson,
            requirements: {
              memory: parseInt(modelSize) || 8,
              disk: (parseInt(modelSize) || 8) * 2,
              gpu: modelSize.includes('70b') ? 'Required' : 'Optional'
            },
            useCase: useCases,
            performance
          });
        } catch (error) {
          console.warn(`Skipping ${dir.name}: No valid config.json found`);
        }
      }
    }

    // Create public directory if it doesn't exist
    await fs.mkdir(path.dirname(OUTPUT_FILE), { recursive: true });

    // Save processed configs to public directory
    await fs.writeFile(OUTPUT_FILE, JSON.stringify(modelConfigs, null, 2));
    console.log(`Processed ${modelConfigs.length} model configurations`);

  } catch (error) {
    console.error('Failed to process model configurations:', error);
    throw error;
  }
}

async function main() {
  try {
    await cloneRepo();
    await processModelConfigs();
    console.log('Successfully updated model configurations');
  } catch (error) {
    console.error('Failed to update model configurations:', error);
    process.exit(1);
  }
}

main();