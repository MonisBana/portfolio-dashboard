import { Controller, Post, Body, Res } from '@nestjs/common';
import { Response } from 'express';
import { Chat } from '@hashbrownai/core';
import { HashbrownGoogle } from '@hashbrownai/google';
import { HashbrownOllama } from '@hashbrownai/ollama';
import * as dotenv from 'dotenv';

dotenv.config();

@Controller('api/chat')
export class AppController {
    private googleApiKey: string | undefined;

    constructor() {
        this.googleApiKey = process.env.GOOGLE_API_KEY;
        if (!this.googleApiKey) {
            console.warn('GOOGLE_API_KEY is not set in environment variables.');
        }
    }

    /**
     * POST /api/chat/google
     * Receives a Chat.Api.CompletionCreateParams from the Hashbrown client,
     * pipes it through HashbrownGoogle.stream.text(), and streams the response.
     */
    @Post('google')
    async chatGoogle(@Body() body: Chat.Api.CompletionCreateParams, @Res() res: Response) {
        if (!this.googleApiKey) {
            return res
                .status(500)
                .json({ error: 'GOOGLE_API_KEY is not configured on the server.' });
        }

        try {
            const stream = HashbrownGoogle.stream.text({
                apiKey: this.googleApiKey,
                request: body,
            });

            res.setHeader('Content-Type', 'application/octet-stream');
            res.setHeader('Transfer-Encoding', 'chunked');

            for await (const chunk of stream) {
                res.write(chunk);
            }
            res.end();
        } catch (error) {
            console.error(
                'Error calling Gemini via Hashbrown:',
                error instanceof Error ? error.message : 'Unknown error',
            );
            if (!res.headersSent) {
                res.status(500).json({
                    error: error instanceof Error ? error.message : 'Unknown error',
                });
            }
        }
    }

    /**
     * POST /api/chat/ollama
     * Receives a Chat.Api.CompletionCreateParams from the Hashbrown client,
     * pipes it through HashbrownOllama.stream.text(), and streams the response.
     */
    @Post('ollama')
    async chatOllama(@Body() body: Chat.Api.CompletionCreateParams, @Res() res: Response) {
        try {
            const stream = HashbrownOllama.stream.text({
                request: body,
            });

            res.setHeader('Content-Type', 'application/octet-stream');
            res.setHeader('Transfer-Encoding', 'chunked');

            for await (const chunk of stream) {
                res.write(chunk);
            }
            res.end();
        } catch (error) {
            console.error(
                'Error calling Ollama via Hashbrown:',
                error instanceof Error ? error.message : 'Unknown error',
            );
            if (!res.headersSent) {
                res.status(500).json({
                    error: error instanceof Error ? error.message : 'Unknown error',
                });
            }
        }
    }
}
