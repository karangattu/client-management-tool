import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Users,
  FileText,
  BarChart3,
  Shield,
  Smartphone,
  Clock,
  ArrowRight,
  CheckCircle2,
} from "lucide-react";

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-white via-white to-gray-50">
      {/* Navigation */}
      <nav className="border-b bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/60 sticky top-0 z-50">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-blue-600 flex items-center justify-center">
              <Users className="h-5 w-5 text-white" />
            </div>
            <span className="font-bold text-xl">ClientHub</span>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/dashboard">
              <Button variant="ghost">Dashboard</Button>
            </Link>
            <Link href="/self-service">
              <Button>
                Client Self-Service
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-20 md:py-32">
        <div className="text-center max-w-3xl mx-auto">
          <div className="inline-flex items-center rounded-full border px-4 py-1.5 text-sm mb-6 bg-gray-100">
            <CheckCircle2 className="h-4 w-4 mr-2 text-green-500" />
            Professional Client Management Made Simple
          </div>
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-6">
            Streamline Your
            <span className="text-blue-600 block">Client Intake Process</span>
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            A comprehensive client management system designed for case managers, 
            social workers, and service providers. Collect, organize, and manage 
            client information with ease.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/client-intake">
              <Button size="lg" className="w-full sm:w-auto">
                <FileText className="h-5 w-5 mr-2" />
                New Client Intake
              </Button>
            </Link>
            <Link href="/clients">
              <Button size="lg" variant="outline" className="w-full sm:w-auto">
                View All Clients
                <ArrowRight className="h-5 w-5 ml-2" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="container mx-auto px-4 py-20">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold mb-4">Everything You Need</h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Comprehensive features designed to make client management efficient and secure
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Card className="border-2 hover:border-primary/50 transition-colors">
            <CardHeader>
              <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                <FileText className="h-6 w-6 text-primary" />
              </div>
              <CardTitle>Comprehensive Intake Forms</CardTitle>
              <CardDescription>
                Multi-section forms covering participant details, emergency contacts, 
                case management, demographics, and household information.
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="border-2 hover:border-primary/50 transition-colors">
            <CardHeader>
              <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                <Clock className="h-6 w-6 text-primary" />
              </div>
              <CardTitle>Auto-Save & Draft Recovery</CardTitle>
              <CardDescription>
                Never lose your progress. Forms automatically save every 30 seconds 
                and can be recovered if you leave accidentally.
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="border-2 hover:border-primary/50 transition-colors">
            <CardHeader>
              <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                <Shield className="h-6 w-6 text-primary" />
              </div>
              <CardTitle>Data Security</CardTitle>
              <CardDescription>
                SSN masking, encrypted storage, and secure data handling. 
                Your client&apos;s sensitive information is protected.
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="border-2 hover:border-primary/50 transition-colors">
            <CardHeader>
              <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                <Smartphone className="h-6 w-6 text-primary" />
              </div>
              <CardTitle>Mobile Responsive</CardTitle>
              <CardDescription>
                Works perfectly on any device. Complete intake forms from your 
                phone, tablet, or desktop with the same great experience.
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="border-2 hover:border-primary/50 transition-colors">
            <CardHeader>
              <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                <BarChart3 className="h-6 w-6 text-primary" />
              </div>
              <CardTitle>Status Tracking</CardTitle>
              <CardDescription>
                Track client status with color-coded badges. Easily filter and 
                search through your client database.
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="border-2 hover:border-primary/50 transition-colors">
            <CardHeader>
              <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                <Users className="h-6 w-6 text-primary" />
              </div>
              <CardTitle>Household Management</CardTitle>
              <CardDescription>
                Track household members and family composition. Add multiple 
                emergency contacts for comprehensive coverage.
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </section>

      {/* Form Sections Preview */}
      <section className="bg-muted/50 py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold mb-4">Complete Intake Process</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Our 5-step intake form covers everything you need to know about your clients
            </p>
          </div>

          <div className="grid md:grid-cols-5 gap-4">
            {[
              { step: 1, title: "Participant Details", desc: "Name, DOB, contact info" },
              { step: 2, title: "Emergency Contacts", desc: "Multiple contacts supported" },
              { step: 3, title: "Case Management", desc: "Status, IDs, housing info" },
              { step: 4, title: "Demographics", desc: "Race, gender, ethnicity" },
              { step: 5, title: "Household", desc: "Family members & relations" },
            ].map((item) => (
              <Card key={item.step} className="text-center">
                <CardContent className="pt-6">
                  <div className="h-10 w-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold mx-auto mb-3">
                    {item.step}
                  </div>
                  <h3 className="font-semibold mb-1">{item.title}</h3>
                  <p className="text-sm text-muted-foreground">{item.desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="container mx-auto px-4 py-20">
        <Card className="bg-primary text-primary-foreground">
          <CardContent className="py-12 text-center">
            <h2 className="text-3xl font-bold mb-4">Ready to Get Started?</h2>
            <p className="text-lg opacity-90 mb-8 max-w-2xl mx-auto">
              Start managing your clients more effectively today. 
              Create your first client intake form in minutes.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/client-intake">
                <Button size="lg" variant="secondary">
                  <FileText className="h-5 w-5 mr-2" />
                  Create Intake Form
                </Button>
              </Link>
              <Link href="/clients">
                <Button size="lg" variant="outline" className="bg-transparent border-primary-foreground text-primary-foreground hover:bg-primary-foreground hover:text-primary">
                  View Dashboard
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Footer */}
      <footer className="border-t bg-muted/30">
        <div className="container mx-auto px-4 py-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="h-6 w-6 rounded bg-primary flex items-center justify-center">
                <Users className="h-4 w-4 text-primary-foreground" />
              </div>
              <span className="font-semibold">ClientHub</span>
            </div>
            <p className="text-sm text-muted-foreground">
              © {new Date().getFullYear()} ClientHub. Built with Next.js and Supabase.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
