
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { fetchSettings } from "@/lib/settings-service";
import type { Metadata } from 'next';

export async function generateMetadata(): Promise<Metadata> {
  const settings = await fetchSettings();
  return {
    title: `About Us | ${settings.siteName}`,
    description: `Learn more about ${settings.siteName} and our mission to help students succeed.`,
  };
}

export default async function AboutPage() {
  const settings = await fetchSettings();
  const team = [
    { name: 'Alex Doe', role: 'Founder & CEO', avatar: 'https://placehold.co/100x100.png', hint: 'male portrait' },
    { name: 'Jane Smith', role: 'Lead Developer', avatar: 'https://placehold.co/100x100.png', hint: 'female portrait' },
    { name: 'Sam Wilson', role: 'Content Strategist', avatar: 'https://placehold.co/100x100.png', hint: 'person portrait' },
  ];

  return (
    <div className="container mx-auto px-6 sm:px-10 lg:px-16 py-12 md:py-16">
      <div className="text-center mb-16">
        <h1 className="text-4xl md:text-5xl font-bold font-headline">About {settings.siteName}</h1>
        <p className="text-lg text-muted-foreground mt-4 max-w-3xl mx-auto">
          We are dedicated to providing the best resources for students to excel in their exams.
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-12 items-center mb-20">
        <div>
          <h2 className="text-3xl font-bold mb-4">Our Mission</h2>
          <p className="text-muted-foreground leading-relaxed">
            Our mission is to democratize education by making high-quality exam preparation materials accessible to every student, everywhere. We believe that with the right tools, anyone can achieve their academic goals. We strive to create a platform that is not only comprehensive but also intuitive and motivating to use.
          </p>
        </div>
        <div>
          <h2 className="text-3xl font-bold mb-4">Our Vision</h2>
          <p className="text-muted-foreground leading-relaxed">
            We envision a world where exam stress is replaced by confidence. Our goal is to be the most trusted and effective online resource for exam preparation, empowering a global community of learners to unlock their full potential and build a brighter future for themselves.
          </p>
        </div>
      </div>

      <div className="text-center">
        <h2 className="text-3xl font-bold font-headline mb-12">Meet the Team</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-8 max-w-4xl mx-auto">
          {team.map((member) => (
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
    </div>
  );
}
