import { BookOpenIcon, HeartIcon, QrCodeIcon, ShieldCheckIcon, SparklesIcon, UsersIcon } from "lucide-react";
import { IFeature } from "../types";

export const features: IFeature[] = [
    {
        title: "Smart Book Discovery",
        description:
            "Browse thousands of books with advanced search and filters. Find exactly what you're looking for by title, author, or condition.",
        icon: BookOpenIcon,
        cardBg: "bg-orange-100",
        iconBg: "bg-orange-500"
    },
    {
        title: "Point-Based Exchange",
        description:
            "Fair and transparent point system powered by AI. Books are valued dynamically based on condition, demand, and rarity.",
        icon: SparklesIcon,
        cardBg: "bg-green-100",
        iconBg: "bg-green-500"
    },
    {
        title: "Wishlist & Notifications",
        description:
            "Save books to your wishlist and get notified when they become available. Never miss a book you've been waiting for.",
        icon: HeartIcon,
        cardBg: "bg-indigo-100",
        iconBg: "bg-indigo-500"
    },
    {
        title: "Secure Exchange System",
        description:
            "Built-in safeguards and anti-abuse measures ensure safe and fair exchanges. Your books and points are protected.",
        icon: ShieldCheckIcon,
        cardBg: "bg-pink-100",
        iconBg: "bg-pink-500"
    },
    {
        title: "Book History & QR Codes",
        description:
            "Each book has a permanent digital identity with QR codes. Track where books have traveled and read community notes from previous readers.",
        icon: QrCodeIcon,
        cardBg: "bg-lime-100",
        iconBg: "bg-lime-500"
    },
    {
        title: "AI Book Assistant",
        description:
            "Ask questions about any book and get intelligent responses based on book metadata and community insights. Perfect for reading guidance.",
        icon: UsersIcon,
        cardBg: "bg-gray-50",
        iconBg: "bg-orange-500",
    },
]

