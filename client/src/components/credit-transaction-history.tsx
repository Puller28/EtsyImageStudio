import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { History, TrendingUp, TrendingDown, DollarSign } from "lucide-react";
import { format } from "date-fns";
import type { CreditTransaction } from "@shared/schema";

interface CreditTransactionHistoryProps {
  className?: string;
}

export default function CreditTransactionHistory({ className }: CreditTransactionHistoryProps) {
  const { data: transactions = [], isLoading, error } = useQuery<CreditTransaction[]>({
    queryKey: ["/api/credit-transactions"],
    staleTime: 30000, // Cache for 30 seconds
  });

  const getTransactionIcon = (type: string, amount: number) => {
    if (type === "purchase" || amount > 0) {
      return <TrendingUp className="w-4 h-4 text-green-500" />;
    }
    return <TrendingDown className="w-4 h-4 text-red-500" />;
  };

  const getTransactionBadge = (type: string, amount: number) => {
    if (type === "purchase" || amount > 0) {
      return <Badge variant="outline" className="text-green-600 border-green-300 bg-green-50">Credit Added</Badge>;
    }
    if (type === "deduction") {
      return <Badge variant="outline" className="text-red-600 border-red-300 bg-red-50">Credit Used</Badge>;
    }
    if (type === "refund") {
      return <Badge variant="outline" className="text-blue-600 border-blue-300 bg-blue-50">Refund</Badge>;
    }
    return <Badge variant="outline">{type}</Badge>;
  };

  const formatAmount = (amount: number) => {
    const sign = amount > 0 ? "+" : "";
    return `${sign}${amount}`;
  };

  if (error) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center">
            <History className="w-5 h-5 mr-2" />
            Credit Transaction History
          </CardTitle>
          <CardDescription>
            Failed to load transaction history. Please try again later.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card className={className} data-testid="credit-transaction-history">
      <CardHeader>
        <CardTitle className="flex items-center">
          <History className="w-5 h-5 mr-2" />
          Credit Transaction History
        </CardTitle>
        <CardDescription>
          Track all your credit usage and purchases
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center space-x-3">
                  <Skeleton className="w-4 h-4" />
                  <div className="space-y-2">
                    <Skeleton className="w-32 h-4" />
                    <Skeleton className="w-24 h-3" />
                  </div>
                </div>
                <div className="text-right space-y-2">
                  <Skeleton className="w-16 h-4" />
                  <Skeleton className="w-12 h-3" />
                </div>
              </div>
            ))}
          </div>
        ) : transactions.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <DollarSign className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <p>No credit transactions yet</p>
            <p className="text-sm">Your credit usage history will appear here</p>
          </div>
        ) : (
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {transactions.map((transaction) => (
              <div
                key={transaction.id}
                className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                data-testid={`transaction-${transaction.id}`}
              >
                <div className="flex items-center space-x-3">
                  {getTransactionIcon(transaction.transactionType, transaction.amount)}
                  <div>
                    <p className="font-medium text-sm" data-testid={`transaction-description-${transaction.id}`}>
                      {transaction.description}
                    </p>
                    <p className="text-xs text-gray-500" data-testid={`transaction-date-${transaction.id}`}>
                      {transaction.createdAt ? format(new Date(transaction.createdAt), "MMM d, yyyy 'at' h:mm a") : "Unknown date"}
                    </p>
                  </div>
                </div>
                <div className="text-right space-y-1">
                  <div className="flex items-center space-x-2">
                    <span 
                      className={`font-medium text-sm ${
                        transaction.amount > 0 ? "text-green-600" : "text-red-600"
                      }`}
                      data-testid={`transaction-amount-${transaction.id}`}
                    >
                      {formatAmount(transaction.amount)} credits
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    {getTransactionBadge(transaction.transactionType, transaction.amount)}
                    <span 
                      className="text-xs text-gray-500"
                      data-testid={`transaction-balance-${transaction.id}`}
                    >
                      Balance: {transaction.balanceAfter}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}