import Link from 'next/link'
import { ArrowRight, BarChart3, PieChart, ShieldCheck, Zap, Globe, FileSpreadsheet } from 'lucide-react'

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background selection:bg-primary/30 selection:text-primary">
      {/* Navigation */}
      <nav className="fixed w-full z-50 bg-background/80 backdrop-blur-md border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-primary p-1.5 rounded-lg">
              <BarChart3 className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="font-bold text-xl text-foreground tracking-tight">Portfolio Dashboard</span>
          </div>
          <div className="flex items-center gap-4">
            <Link
              href="/dashboard"
              className="text-sm font-medium text-primary-foreground bg-primary hover:bg-primary/90 px-4 py-2 rounded-full transition-all shadow-sm shadow-primary/20"
            >
              Open Dashboard
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto text-center">
        <div className="max-w-3xl mx-auto space-y-8">
          <h1 className="text-5xl sm:text-6xl font-extrabold text-foreground tracking-tight leading-[1.1]">
            Track all your investments in <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-primary/60">one beautiful dashboard</span>
          </h1>
          <p className="text-lg sm:text-xl text-muted-foreground leading-relaxed max-w-2xl mx-auto">
            Stop switching between broker apps. Combine your Indian stocks, US stocks, and mutual funds into a single, comprehensive view.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            <Link
              href="/dashboard"
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-8 py-4 text-base font-semibold text-primary-foreground bg-primary hover:bg-primary/90 rounded-full transition-all shadow-lg shadow-primary/20"
            >
              Get started
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="/upload"
              className="w-full sm:w-auto px-8 py-4 text-base font-semibold text-foreground bg-background hover:bg-accent border border-border rounded-full transition-all shadow-sm"
            >
              Add your portfolio
            </Link>
          </div>
        </div>

        {/* Hero Image / Dashboard Mockup placeholder */}
        <div className="mt-16 relative max-w-5xl mx-auto">
          <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent z-10" />
          <div className="rounded-2xl border border-border/60 bg-card/[0.6] p-2 sm:p-4 backdrop-blur-sm shadow-2xl shadow-primary/10">
            <div className="rounded-xl border border-border/50 bg-card overflow-hidden aspect-[16/9] flex items-center justify-center relative">
              {/* Abstract placeholder for the dashboard UI */}
              <div className="absolute inset-0 bg-background/50 p-8 grid grid-cols-12 gap-6 opacity-60">
                <div className="col-span-3 space-y-4">
                  <div className="h-24 bg-card rounded-xl shadow-sm border border-border" />
                  <div className="h-64 bg-card rounded-xl shadow-sm border border-border" />
                </div>
                <div className="col-span-6 space-y-4">
                  <div className="h-48 bg-card rounded-xl shadow-sm border border-border" />
                  <div className="h-64 bg-card rounded-xl shadow-sm border border-border flex items-center justify-center">
                    <PieChart className="w-16 h-16 text-primary/40" />
                  </div>
                </div>
                <div className="col-span-3 space-y-4">
                  <div className="h-32 bg-card rounded-xl shadow-sm border border-border" />
                  <div className="h-48 bg-card rounded-xl shadow-sm border border-border" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-24 bg-background border-y border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl font-bold text-foreground tracking-tight">Everything you need to manage wealth</h2>
            <p className="mt-4 text-lg text-muted-foreground">Powerful tools designed for retail investors who want complete control over their portfolio.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {features.map((feature, idx) => (
              <div key={idx} className="bg-card rounded-2xl p-8 border border-border hover:border-primary/50 transition-colors">
                <div className="w-12 h-12 bg-primary/10 text-primary rounded-xl flex items-center justify-center mb-6">
                  {feature.icon}
                </div>
                <h3 className="text-xl font-semibold text-foreground mb-3">{feature.title}</h3>
                <p className="text-muted-foreground leading-relaxed">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 bg-muted text-center relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-tr from-primary/10 to-transparent opacity-50" />
        <div className="relative z-10 max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
          <h2 className="text-4xl font-bold text-foreground tracking-tight">Ready to take control?</h2>
          <p className="text-xl text-muted-foreground">Join thousands of investors tracking their portfolios effortlessly.</p>
          <Link
            href="/dashboard"
            className="inline-flex items-center justify-center gap-2 px-8 py-4 text-base font-semibold text-primary-foreground bg-primary hover:bg-primary/90 rounded-full transition-all shadow-xl shadow-primary/20"
          >
            Open Dashboard
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-muted/50 py-12 border-t border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-foreground">
            <BarChart3 className="w-5 h-5 text-primary" />
            <span className="font-bold">Portfolio Dashboard</span>
          </div>
          <p className="text-muted-foreground text-sm">© {new Date().getFullYear()} PortfolioDashboard. All rights reserved.</p>
        </div>
      </footer>
    </div>
  )
}

const features = [
  {
    icon: <Globe className="w-6 h-6" />,
    title: 'Multi-Broker Support',
    description: 'Import data from Zerodha, Groww, INDmoney, Vested, and more. See your entire net worth in one place.',
  },
  {
    icon: <FileSpreadsheet className="w-6 h-6" />,
    title: 'Easy Excel Uploads',
    description: 'Simply drag and drop your broker statements. Our intelligent parser automatically categorized stocks and mutual funds.',
  },
  {
    icon: <PieChart className="w-6 h-6" />,
    title: 'Advanced Analytics',
    description: 'Visualize your asset allocation, sector exposure, and geographical distribution with beautiful, interactive charts.',
  },
  {
    icon: <Zap className="w-6 h-6" />,
    title: 'AI Portfolio Assistant',
    description: 'Chat with an AI about your portfolio. Ask questions about your performance, asset allocation, and specific holdings.',
  },
  {
    icon: <ShieldCheck className="w-6 h-6" />,
    title: 'Private & Secure',
    description: 'Your portfolio data stays securely on your device or synced privately via our encrypted database.',
  },
  {
    icon: <BarChart3 className="w-6 h-6" />,
    title: 'Real-time Tracking',
    description: 'Monitor your returns and daily P&L. Keep manual assets like Cash and Fixed Deposits alongside your equities.',
  },
]
