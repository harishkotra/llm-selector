import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

export async function GET() {
  try {
    const configPath = path.join(process.cwd(), 'public/model-configs.json');
    const configData = await fs.readFile(configPath, 'utf-8');
    return NextResponse.json(JSON.parse(configData));
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch model configurations' },
      { status: 500 }
    );
  }
}