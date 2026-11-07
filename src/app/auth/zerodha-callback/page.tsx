"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { zerodhaClient } from "@/lib/api/zerodha-client";
import { Loader2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function ZerodhaCallbackPage() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const [error, setError] = useState<string | null>(null);
    const [isProcessing, setIsProcessing] = useState(true);

    useEffect(() => {
        const requestToken = searchParams.get('request_token');
        const status = searchParams.get('status');

        if (status === 'success' && requestToken) {
            const member = sessionStorage.getItem('zerodha_pending_member') || 'Self';
            zerodhaClient.handleCallback(requestToken, member)
                .then(() => {
                    router.push(`/upload?zerodha_connected=true&zerodha_member=${encodeURIComponent(member)}`);
                })
                .catch(err => {
                    setError(err.message || 'Authentication failed');
                    setIsProcessing(false);
                });
        } else {
            setError('Authentication cancelled or failed');
            setIsProcessing(false);
        }
    }, [searchParams, router]);

    return (
        <div className="flex min-h-screen items-center justify-center p-4">
            {error ? (
                <div className="text-center max-w-md">
                    <div className="mb-4 flex justify-center">
                        <XCircle className="h-16 w-16 text-red-500" />
                    </div>
                    <h2 className="text-2xl font-semibold text-red-600 mb-2">Authentication Failed</h2>
                    <p className="mt-2 text-gray-600 mb-6">{error}</p>
                    <Button onClick={() => router.push('/upload')}>
                        Return to Upload
                    </Button>
                </div>
            ) : (
                <div className="text-center">
                    <Loader2 className="h-12 w-12 animate-spin mx-auto text-primary" />
                    <p className="mt-4 text-gray-600 text-lg">Completing authentication...</p>
                    <p className="mt-2 text-sm text-gray-500">Please wait while we connect to Zerodha</p>
                </div>
            )}
        </div>
    );
}
