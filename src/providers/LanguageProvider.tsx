"use client";

import { NextIntlClientProvider } from "next-intl";
import { useLanguage } from "@/utils/useLanguage";
import { useEffect, useState } from "react";
// Synchronously import default English messages to ensure they're available immediately
import defaultEnglishMessages from "@/messages/en.json";

interface LanguageProviderProps {
  children: React.ReactNode;
}

export default function LanguageProvider({ children }: LanguageProviderProps) {
  const { language, isInitialized } = useLanguage();
  const [messages, setMessages] = useState<any>(null);

  useEffect(() => {
    if (isInitialized) {
      // Dynamically load messages based on language
      if (language === "en") {
        // Use already imported English messages
        setMessages(defaultEnglishMessages);
      } else {
        import(`@/messages/${language}.json`)
          .then((mod) => {
            setMessages(mod.default);
          })
          .catch((err) => {
            console.error("Failed to load messages:", err);
            // Fallback to English
            setMessages(defaultEnglishMessages);
          });
      }
    }
  }, [language, isInitialized]);

  // Always provide NextIntlClientProvider, use default messages if not loaded yet
  const currentMessages = messages || defaultEnglishMessages;
  const currentLocale = isInitialized ? language : "en";

  // Get timezone from browser or use UTC as default
  const timeZone =
    typeof Intl !== "undefined" && Intl.DateTimeFormat
      ? Intl.DateTimeFormat().resolvedOptions().timeZone
      : "UTC";

  return (
    <NextIntlClientProvider
      locale={currentLocale}
      messages={currentMessages}
      timeZone={timeZone}
    >
      {children}
    </NextIntlClientProvider>
  );
}
