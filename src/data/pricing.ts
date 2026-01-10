import { IPricingPlan } from "@/types";
import { RocketIcon, UserIcon, UsersIcon } from "lucide-react";

export const pricing: IPricingPlan[] = [
    {
        icon: RocketIcon,
        name: "Community",
        description: "Join Readloom and start exchanging books today. Completely free forever.",
        price: 0,
        linkText: "Join Free",
        linkUrl: "/signup",
        features: [
            "Unlimited book exchanges",
            "AI-powered book valuation",
            "Book history & QR codes",
            "Wishlist & notifications",
            "Community support",
        ],
    },
    {
        icon: UserIcon,
        name: "Reader",
        description: "Perfect for book lovers who want to build their library through exchange.",
        price: 0,
        linkText: "Start Reading",
        linkUrl: "/signup",
        features: [
            "All Community features",
            "Priority book requests",
            "Advanced search filters",
            "Reading recommendations",
            "Book discussion forums",
        ],
    },
    {
        icon: UsersIcon,
        name: "Book Club",
        type: "popular",
        description: "Best for reading groups and book clubs sharing books together.",
        price: 0,
        linkText: "Create Club",
        linkUrl: "/signup",
        features: [
            "All Reader features",
            "Group book sharing",
            "Reading challenges",
            "Community events",
            "Dedicated support",
        ],
    },
    {
        icon: UserIcon,
        name: "Librarian",
        type: "enterprise",
        description: "For libraries and institutions managing large book collections.",
        price: 0,
        linkText: "Contact Us",
        linkUrl: "/signup",
        features: [
            "All Book Club features",
            "Bulk book management",
            "Custom integrations",
            "Analytics dashboard",
            "Dedicated account manager",
        ],
    },
];

