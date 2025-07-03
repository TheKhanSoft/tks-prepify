import { Facebook, Github, Instagram, Linkedin, Twitter, Youtube, Link as LinkIcon, MessageSquare, MessageCircle, Twitch, Ghost, Send } from "lucide-react";

export const socialPlatforms = [
    { value: 'facebook', label: 'Facebook', icon: Facebook },
    { value: 'instagram', label: 'Instagram', icon: Instagram },
    { value: 'twitter', label: 'Twitter / X', icon: Twitter },
    { value: 'linkedin', label: 'LinkedIn', icon: Linkedin },
    { value: 'youtube', label: 'YouTube', icon: Youtube },
    { value: 'github', label: 'GitHub', icon: Github },
    { value: 'discord', label: 'Discord', icon: MessageSquare },
    { value: 'threads', label: 'Threads', icon: MessageCircle },
    { value: 'twitch', label: 'Twitch', icon: Twitch },
    { value: 'telegram', label: 'Telegram', icon: Send },
    { value: 'whatsapp', label: 'WhatsApp', icon: MessageSquare },
    { value: 'snapchat', label: 'Snapchat', icon: Ghost },
    { value: 'other', label: 'Other', icon: LinkIcon },
];
