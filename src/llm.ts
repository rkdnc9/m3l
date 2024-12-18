import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';

export class LLMHandler {
    private openai: OpenAI | null = null;
    private anthropic: Anthropic | null = null;
    private provider: 'openai' | 'claude';

    constructor(apiKey: string, provider: 'openai' | 'claude') {
        this.provider = provider;
        if (provider === 'openai') {
            this.openai = new OpenAI({ apiKey, dangerouslyAllowBrowser: true });
        } else {
            this.anthropic = new Anthropic({ apiKey });
        }
    }

    async getNLToSQL(schema: string, query: string): Promise<string> {
        const prompt = `
        Given the following table schema for table 'data_table': ${schema}
        
        Important notes:
        1. The table name is 'data_table'
        2. Always use 'data_table' as the table name in your SQL query
        3. Return only the SQL query, no explanations
        
        Generate SQL query for this question: ${query}`;
        
        if (this.provider === 'openai') {
            const response = await this.openai!.chat.completions.create({
                model: "gpt-3.5-turbo",
                messages: [
                    {
                        role: "system",
                        content: "You are a SQL query generator. Only return the DuckDB compatible SQL query, no explanations. Always use 'data_table' as the table name."
                    },
                    { 
                        role: "user", 
                        content: prompt 
                    }
                ]
            });
            return response.choices[0].message.content || '';
        } else {
            const response = await this.anthropic!.messages.create({
                model: "claude-2",
                max_tokens: 1024,
                messages: [
                    {
                        role: "user",
                        content: prompt
                    }
                ]
            });
        
            // Fix the type error by checking the content type
            if (response.content[0].type === 'text') {
                return response.content[0].text;
            }
            return '';
        }
    }
}