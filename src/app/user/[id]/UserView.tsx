"use client";

import { useUserInfo } from "@/hooks/userInfo";
import LoadingView from "@/components/commons/LoadingView";
import Image from "next/image";
import TabView from "@/components/commons/TabView";
import UserCopanyView from "./subTabs/UserCopanyView";
import AccountView from "./subTabs/AccountView";
import { Squares2X2Icon, UserCircleIcon } from "@heroicons/react/24/outline";

interface UserViewProps {
  userId: string;
}

export default function UserView({ userId }: UserViewProps) {
  const { data: user, isLoading: loading } = useUserInfo(userId);
  if (loading) {
    return <LoadingView type="page" />;
  }
  if (!user) {
    return <div className="p-8 max-w-[820px] mx-auto">User not found</div>;
  }

  console.log(`[UserView] 🚀 Component initialized:`, {
    userId,
    user,
  });

  const tabs = [
    {
      label: "Working on",
      icon: <Squares2X2Icon strokeWidth={2} className="w-4 h-4" />,
      content: <UserCopanyView userId={userId} />,
    },
    {
      label: "Account",
      icon: <UserCircleIcon strokeWidth={2} className="w-4 h-4" />,
      content: <AccountView userId={userId} />,
    },
  ];

  return (
    <div className="flex flex-col gap-4 max-w-[820px] mx-auto py-6">
      <div className="flex flex-row gap-4 items-center">
        <Image
          src={user.avatar_url}
          alt={user.name}
          width={120}
          height={120}
          className="rounded-full"
        />
        <div className="flex flex-col gap-2">
          <div className="text-2xl font-bold">{user.name}</div>
          <div className="text-base text-gray-500">{user.email}</div>
        </div>
      </div>
      <div className="-mx-5">
        <TabView tabs={tabs} />
      </div>
    </div>
  );
}
