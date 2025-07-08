
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { fetchSettings } from "@/lib/settings-service";
import type { Metadata } from 'next';
import ReactMarkdown from 'react-markdown';

export const revalidate = 3600; // Revalidate every hour

export async function generateMetadata(): Promise<Metadata> {
  const settings = await fetchSettings();
  const description = settings.aboutSubtitle || `Learn more about ${settings.siteName} and our mission to help students succeed.`;
  return {
    title: settings.aboutTitle || 'About Us',
    description,
  };
}

export default async function AboutPage() {
  const settings = await fetchSettings();

  return (
    <div className="container mx-auto px-6 sm:px-10 lg:px-16 py-12 md:py-16">
      <div className="text-center mb-16">
        <h1 className="text-4xl md:text-5xl font-bold font-headline">{settings.aboutTitle}</h1>
        <div className="prose prose-lg dark:prose-invert text-muted-foreground mt-4 max-w-3xl mx-auto">
          <ReactMarkdown>{settings.aboutSubtitle || ''}</ReactMarkdown>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-12 items-center mb-20">
        <div className="prose dark:prose-invert">
          <h2 className="text-3xl font-bold mb-4">Our Mission</h2>
          <ReactMarkdown className="text-muted-foreground leading-relaxed">
            {settings.aboutMission || ''}
          </ReactMarkdown>
        </div>
        <div className="prose dark:prose-invert">
          <h2 className="text-3xl font-bold mb-4">Our Vision</h2>
          <ReactMarkdown className="text-muted-foreground leading-relaxed">
            {settings.aboutVision || ''}
          </ReactMarkdown>
        </div>
      </div>

      {settings.teamMembers && settings.teamMembers.length > 0 && (
        <div className="text-center">
            <h2 className="text-3xl font-bold font-headline mb-12">{settings.aboutTeamTitle}</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            {settings.teamMembers.map((member) => (
                <Card key={member.name} className="text-center">
                <CardContent className="p-6">
                    <Avatar className="h-24 w-24 mx-auto mb-4">
                    <AvatarImage src={member.avatar} alt={member.name} data-ai-hint={member.hint} />
                    <AvatarFallback>{member.name.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <h3 className="text-xl font-semibold">{member.name}</h3>
                    <p className="text-primary">{member.role}</p>
                </CardContent>
                </Card>
            ))}
            </div>
        </div>
      )}
    </div>
  );
}
