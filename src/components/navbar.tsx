"use client";
import { links } from "@/data/links";
import { ILink } from "@/types";
import { MenuIcon, XIcon, User } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import AnimatedContent from "./animated-content";
import { useAuth } from "@/hooks/useAuth";

export default function Navbar() {
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const { user, isAuthenticated } = useAuth();

    return (
        <>
            <AnimatedContent reverse>
                <nav className='fixed w-full top-0 z-50 px-4 md:px-16 lg:px-24 xl:px-32 py-4 border-b transition-all duration-300 border-neutral-300 bg-white'>
                    <div className="max-w-7xl mx-auto flex items-center justify-between">
                        <Link href="/">
                            <Image src="/assets/readloom.svg" alt="Readloom Logo" width={180} height={48} />
                        </Link>

                        <div className="hidden md:flex gap-3 items-center">
                            {links.map((link: ILink) => (
                                <Link key={link.name} href={link.href} className="py-1 px-3 hover:text-zinc-500">
                                    {link.name}
                                </Link>
                            ))}
                        </div>

                        <button className="md:hidden" onClick={() => setIsMenuOpen(!isMenuOpen)}>
                            <MenuIcon className="size-6.5" />
                        </button>

                        <div className="hidden md:flex items-center gap-3">
                            {isAuthenticated ? (
                                <Link
                                    href="/profile"
                                    className="flex items-center gap-2 px-3 py-2 hover:bg-gray-100 rounded-full transition-colors"
                                    title={user?.name || user?.email || 'Profile'}
                                >
                                    <div className="w-8 h-8 bg-orange-500 rounded-full flex items-center justify-center text-white text-sm font-urbanist font-bold">
                                        {user?.name?.charAt(0).toUpperCase() || user?.email?.charAt(0).toUpperCase() || 'U'}
                                    </div>
                                </Link>
                            ) : (
                                <Link href="/login" className="py-1 px-3 hover:text-zinc-500">
                                    Sign In
                                </Link>
                            )}
                            <Link href="/books" className="py-2.5 px-6 shadow-[inset_0_2px_4px_rgba(255,255,255,0.6)] bg-orange-500 text-white rounded-full">
                                Browse Books
                            </Link>
                        </div>
                    </div>
                </nav>
            </AnimatedContent>
            <div className={`fixed top-0 right-0 z-60 w-full bg-white shadow-xl shadow-black/5 transition-all duration-300 ease-in-out ${isMenuOpen ? "h-screen overflow-auto" : "h-0 overflow-hidden"}`}>
                <div className="flex items-center justify-between p-4">
                    <Image src="/assets/readloom.svg" alt="Readloom Logo" width={180} height={48} />
                    <XIcon className="size-6.5" onClick={() => setIsMenuOpen(false)} />
                </div>
                <div className="flex flex-col gap-4 p-4 text-base">
                    {links.map((link: ILink) => (
                        <Link key={link.name} href={link.href} className="py-1 px-3" onClick={() => setIsMenuOpen(false)}>
                            {link.name}
                        </Link>
                    ))}
                    {isAuthenticated ? (
                        <Link
                            href="/profile"
                            className="flex items-center gap-2 py-1 px-3"
                            onClick={() => setIsMenuOpen(false)}
                        >
                            <div className="w-8 h-8 bg-orange-500 rounded-full flex items-center justify-center text-white text-sm font-urbanist font-bold">
                                {user?.name?.charAt(0).toUpperCase() || user?.email?.charAt(0).toUpperCase() || 'U'}
                            </div>
                            <span>Profile</span>
                        </Link>
                    ) : (
                        <Link href="/login" className="py-1 px-3" onClick={() => setIsMenuOpen(false)}>
                            Sign In
                        </Link>
                    )}
                    <Link href="/books" className="py-2.5 px-6 w-max text-sm shadow-[inset_0_2px_4px_rgba(255,255,255,0.6)] bg-linear-to-tl from-orange-600 to-orange-500 text-white rounded-full">
                        Browse Books
                    </Link>
                </div>
            </div>
        </>
    );
}

