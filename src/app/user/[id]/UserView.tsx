"use client";

import { useUserInfo } from "@/hooks/userInfo";
import LoadingView from "@/components/commons/LoadingView";
import Image from "next/image";

interface UserViewProps {
  userId: string;
}

export default function UserView({ userId }: UserViewProps) {
  const { data: user, isLoading: loading } = useUserInfo(userId);
  if (loading) {
    return <LoadingView type="page" />;
  }
  if (!user) {
    return <div className="p-8 max-w-screen-lg mx-auto">User not found</div>;
  }

  console.log(`[UserView] 🚀 Component initialized:`, {
    userId,
    user,
  });
  return (
    <div className="p-8 max-w-screen-lg mx-auto">
      <Image
        src={user.avatar_url}
        alt={user.name}
        width={120}
        height={120}
        className="rounded-full"
      />
      <div className="text-2xl font-bold">{user.name}</div>
      <div className="text-sm text-gray-500">{user.email}</div>
    </div>
  );
}
