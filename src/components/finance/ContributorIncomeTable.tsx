"use client";

import { useMemo } from "react";
import { useDistributes } from "@/hooks/finance";
import { useUsersInfo } from "@/hooks/userInfo";
import Image from "next/image";
import { shimmerDataUrlWithTheme } from "@/utils/shimmer";
import { useDarkMode } from "@/utils/useDarkMode";

interface ContributorIncomeTableProps {
  copanyId: string;
}

// Helper function to format amount
function formatAmount(amount: number, currency: string): string {
  const absAmount = Math.abs(amount);
  return `${currency} ${absAmount.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export default function ContributorIncomeTable({
  copanyId,
}: ContributorIncomeTableProps) {
  const { data: distributes = [] } = useDistributes(copanyId);
  const isDarkMode = useDarkMode();

  // Calculate total income for each contributor
  const contributorIncomes = useMemo(() => {
    const incomeMap = new Map<
      string,
      { totalAmount: number; currency: string }
    >();

    distributes.forEach((distribute) => {
      const userId = distribute.to_user;
      const existing = incomeMap.get(userId);

      if (existing) {
        // Convert to USD for comparison (assuming all currencies are converted)
        // For simplicity, we'll just sum amounts with the same currency
        if (existing.currency === distribute.currency) {
          incomeMap.set(userId, {
            totalAmount: existing.totalAmount + distribute.amount,
            currency: existing.currency,
          });
        } else {
          // If currencies differ, use the first one encountered
          // In a real scenario, you'd want to convert currencies
          incomeMap.set(userId, {
            totalAmount: existing.totalAmount + distribute.amount,
            currency: existing.currency,
          });
        }
      } else {
        incomeMap.set(userId, {
          totalAmount: distribute.amount,
          currency: distribute.currency,
        });
      }
    });

    return Array.from(incomeMap.entries())
      .map(([userId, { totalAmount, currency }]) => ({
        userId,
        totalAmount,
        currency,
      }))
      .filter((item) => item.totalAmount > 0) // Only show contributors with positive income
      .sort((a, b) => b.totalAmount - a.totalAmount) // Sort by total amount descending
      .map((item, index) => ({
        ...item,
        rank: index + 1,
      }));
  }, [distributes]);

  // Get user IDs for fetching user info
  const userIds = useMemo(() => {
    return contributorIncomes.map((item) => item.userId);
  }, [contributorIncomes]);

  // Fetch user info
  const { data: usersInfo = {} } = useUsersInfo(userIds);

  if (contributorIncomes.length === 0) {
    return (
      <p className="text-sm text-gray-500 dark:text-gray-400">
        Contributor income history will appear here once distributions are
        recorded.
      </p>
    );
  }

  return (
    <div className="w-full">
      <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="font-base bg-gray-100 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
              <tr>
                <th className="px-4 py-3 text-left">Contributor</th>
                <th className="px-4 py-3 text-left">Rank</th>
                <th className="px-4 py-3 text-right">Income</th>
              </tr>
            </thead>
            <tbody>
              {contributorIncomes.map((item) => {
                const userInfo = usersInfo[item.userId];
                const userName = userInfo?.name || "";
                const userAvatar = userInfo?.avatar_url || "";

                return (
                  <tr
                    key={item.userId}
                    className="hover:bg-gray-50 dark:hover:bg-gray-800/50"
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {userAvatar ? (
                          <Image
                            src={userAvatar}
                            alt={userName}
                            width={20}
                            height={20}
                            className="w-5 h-5 rounded-full"
                            placeholder="blur"
                            blurDataURL={shimmerDataUrlWithTheme(
                              20,
                              20,
                              isDarkMode
                            )}
                          />
                        ) : (
                          <div
                            className="w-5 h-5 rounded-full bg-gray-200 dark:bg-gray-700 border border-white dark:border-black flex items-center justify-center text-xs text-gray-600 dark:text-gray-300"
                            title={userName}
                          >
                            {userName.slice(0, 1).toUpperCase()}
                          </div>
                        )}
                        <span className="text-gray-900 dark:text-gray-100">
                          {userName}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-900 dark:text-gray-100">
                      #{item.rank}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-900 dark:text-gray-100">
                      {formatAmount(item.totalAmount, item.currency)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
