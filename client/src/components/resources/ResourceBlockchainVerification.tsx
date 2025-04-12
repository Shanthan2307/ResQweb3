import { useState } from 'react';
import { useWallet } from '@/hooks/use-wallet';
import { useAuth } from '@/hooks/use-auth';
import { recordResourceFulfillment } from '@/lib/solana/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle, CheckCircle, Loader2, ShieldCheck } from 'lucide-react';
import { ResourceRequest } from '@shared/schema';
import { useMutation } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';

interface ResourceBlockchainVerificationProps {
  request: ResourceRequest;
  onComplete: () => void;
}

export default function ResourceBlockchainVerification({ 
  request, 
  onComplete 
}: ResourceBlockchainVerificationProps) {
  const { user } = useAuth();
  const { wallet, signAndSendTransaction } = useWallet();
  const [verificationStatus, setVerificationStatus] = useState<'idle' | 'processing' | 'success' | 'error'>('idle');
  const [txSignature, setTxSignature] = useState<string | null>(null);

  // Mutation to update the resource request status
  const updateRequestMutation = useMutation({
    mutationFn: async (data: { 
      requestId: number;
      status: string;
      transactionSignature?: string;
    }) => {
      const res = await apiRequest('PATCH', `/api/resource-requests/${data.requestId}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/resource-requests'] });
      setVerificationStatus('success');
    },
    onError: () => {
      setVerificationStatus('error');
    },
  });

  const handleVerification = async () => {
    try {
      if (!wallet.connected || !wallet.publicKey) {
        throw new Error('Wallet not connected');
      }

      if (!user) {
        throw new Error('User not authenticated');
      }

      setVerificationStatus('processing');

      // Record the resource fulfillment on the blockchain
      const resourceDetails = {
        resourceType: request.resourceType,
        quantity: request.quantity,
        fireStationId: request.requesterId,
        fulfillingUser: user.username,
        timestamp: Date.now(),
        purpose: request.description || 'Emergency resource request',
      };

      // Create the transaction
      const transaction = await recordResourceFulfillment(
        wallet.publicKey,
        resourceDetails
      );

      // Sign and send the transaction
      const signature = await signAndSendTransaction(transaction);
      setTxSignature(signature);

      // Update the resource request status
      await updateRequestMutation.mutateAsync({
        requestId: request.id,
        status: 'fulfilled',
        transactionSignature: signature,
      });
    } catch (error) {
      console.error('Error verifying resource fulfillment:', error);
      setVerificationStatus('error');
    }
  };

  // Show different card based on verification status
  if (verificationStatus === 'success') {
    return (
      <Card className="shadow-md">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg font-semibold flex items-center">
            <CheckCircle className="mr-2 h-5 w-5 text-green-500" />
            Verification Successful
          </CardTitle>
        </CardHeader>
        <CardContent className="pb-3">
          <p className="text-sm">
            Resource fulfillment has been successfully verified on the blockchain.
            The request status has been updated to "fulfilled".
          </p>
          {txSignature && (
            <div className="mt-2">
              <p className="text-xs text-neutral-500">Transaction Hash:</p>
              <a 
                href={`https://explorer.solana.com/tx/${txSignature}?cluster=devnet`}
                target="_blank" 
                rel="noopener noreferrer"
                className="text-xs text-blue-500 hover:underline break-all"
              >
                {txSignature}
              </a>
            </div>
          )}
        </CardContent>
        <CardFooter>
          <Button 
            onClick={onComplete} 
            variant="outline" 
            className="w-full"
          >
            Close
          </Button>
        </CardFooter>
      </Card>
    );
  }

  if (verificationStatus === 'error') {
    return (
      <Card className="shadow-md border-red-200">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg font-semibold flex items-center text-red-600">
            <AlertCircle className="mr-2 h-5 w-5" />
            Verification Failed
          </CardTitle>
        </CardHeader>
        <CardContent className="pb-3">
          <p className="text-sm">There was an error recording this resource fulfillment on the blockchain. Please try again.</p>
          <p className="text-xs text-neutral-500 mt-2">
            Common issues include:
            <ul className="list-disc pl-5 mt-1">
              <li>Insufficient SOL for transaction fees</li>
              <li>Wallet disconnected during transaction</li>
              <li>Transaction rejected by user</li>
            </ul>
          </p>
        </CardContent>
        <CardFooter className="flex space-x-2">
          <Button 
            onClick={() => setVerificationStatus('idle')} 
            variant="outline" 
            className="flex-1"
          >
            Try Again
          </Button>
          <Button 
            onClick={onComplete} 
            variant="ghost" 
            className="flex-1"
          >
            Cancel
          </Button>
        </CardFooter>
      </Card>
    );
  }

  // Show verification form
  return (
    <Card className="shadow-md">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg font-semibold flex items-center">
          <ShieldCheck className="mr-2 h-5 w-5" />
          Verify Resource Fulfillment
        </CardTitle>
        <CardDescription>
          Record this resource fulfillment on the Solana blockchain for transparency and verification
        </CardDescription>
      </CardHeader>
      
      <CardContent className="pb-3">
        <div className="space-y-3">
          <div className="text-sm">
            <span className="font-medium">Resource Type:</span> {request.resourceType}
          </div>
          <div className="text-sm">
            <span className="font-medium">Quantity:</span> {request.quantity}
          </div>
          <div className="text-sm">
            <span className="font-medium">Purpose:</span> {request.description || 'Not specified'}
          </div>
          <div className="text-sm">
            <span className="font-medium">Requester ID:</span> {request.requesterId}
          </div>
          
          <div className="text-sm bg-blue-50 p-3 rounded-md">
            <p className="font-medium text-blue-700">Why record on blockchain?</p>
            <p className="text-xs text-blue-600 mt-1">
              Recording fulfillment on the blockchain creates an immutable proof of contribution, 
              enhancing transparency and accountability in emergency resource distribution.
            </p>
          </div>
        </div>
      </CardContent>
      
      <CardFooter className="flex space-x-2">
        <Button 
          onClick={handleVerification} 
          className="flex-1" 
          disabled={!wallet.connected || verificationStatus === 'processing'}
        >
          {verificationStatus === 'processing' ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Processing...
            </>
          ) : (
            'Verify on Blockchain'
          )}
        </Button>
        <Button 
          onClick={onComplete} 
          variant="outline" 
          className="flex-1"
          disabled={verificationStatus === 'processing'}
        >
          Skip
        </Button>
      </CardFooter>
    </Card>
  );
}