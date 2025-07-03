import type { LucideIcon } from "lucide-react";

type SocialPlatform = {
    value: string;
    label: string;
    iconName: string;
}

export const socialPlatforms: SocialPlatform[] = [
    { value: 'facebook', label: 'Facebook', iconName: 'Facebook' },
    { value: 'instagram', label: 'Instagram', iconName: 'Instagram' },
    { value: 'twitter', label: 'Twitter / X', iconName: 'Twitter' },
    { value: 'linkedin', label: 'LinkedIn', iconName: 'Linkedin' },
    { value: 'youtube', label: 'YouTube', iconName: 'Youtube' },
    { value: 'github', label: 'GitHub', iconName: 'Github' },
    { value: 'discord', label: 'Discord', iconName: 'MessageSquare' },
    { value: 'threads', label: 'Threads', iconName: 'MessageCircle' },
    { value: 'twitch', label: 'Twitch', iconName: 'Twitch' },
    { value: 'telegram', label: 'Telegram', iconName: 'Send' },
    { value: 'whatsapp', label: 'WhatsApp', iconName: 'MessageSquare' },
    { value: 'snapchat', label: 'Snapchat', iconName: 'Ghost' },
    { value: 'other', label: 'Other', iconName: 'Link' },
];
