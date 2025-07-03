
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { fetchSettings } from "@/lib/settings-service";
import type { Metadata } from 'next';
import { Mail, Phone, MapPin } from "lucide-react";

export async function generateMetadata(): Promise<Metadata> {
  const settings = await fetchSettings();
  return {
    title: `Contact Us | ${settings.siteName}`,
    description: `Get in touch with the ${settings.siteName} team.`,
  };
}

export default function ContactPage() {
  return (
    <div className="container mx-auto px-6 sm:px-10 lg:px-16 py-12 md:py-16">
      <div className="text-center mb-16">
        <h1 className="text-4xl md:text-5xl font-bold font-headline">Contact Us</h1>
        <p className="text-lg text-muted-foreground mt-4 max-w-3xl mx-auto">
          Have a question or feedback? We'd love to hear from you.
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-12">
        <Card>
          <CardHeader>
            <CardTitle>Send us a message</CardTitle>
            <CardDescription>Fill out the form and we'll get back to you as soon as possible.</CardDescription>
          </CardHeader>
          <CardContent>
            <form className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="name">Full Name</Label>
                <Input id="name" placeholder="John Doe" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <Input id="email" type="email" placeholder="john.doe@example.com" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="subject">Subject</Label>
                <Input id="subject" placeholder="Question about a paper" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="message">Message</Label>
                <Textarea id="message" placeholder="Your message..." rows={5} />
              </div>
              <Button type="submit" className="w-full">Submit Message</Button>
            </form>
          </CardContent>
        </Card>

        <div className="space-y-8">
            <h3 className="text-2xl font-bold">Our Contact Information</h3>
            <div className="space-y-4 text-lg">
                <div className="flex items-center gap-4">
                    <Mail className="h-6 w-6 text-primary" />
                    <span className="text-muted-foreground">contact@prepify.com</span>
                </div>
                 <div className="flex items-center gap-4">
                    <Phone className="h-6 w-6 text-primary" />
                    <span className="text-muted-foreground">+1 (555) 123-4567</span>
                </div>
                 <div className="flex items-center gap-4">
                    <MapPin className="h-6 w-6 text-primary" />
                    <span className="text-muted-foreground">123 Education Lane, Knowledge City, 45678</span>
                </div>
            </div>
             <p className="text-muted-foreground">
                You can also reach out to us on our social media channels. We're active and ready to help!
            </p>
        </div>
      </div>
    </div>
  );
}
