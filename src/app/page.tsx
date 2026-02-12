"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowRight,
  Upload,
  Users,
  FileText,
  Search,
  TrendingUp,
  ClipboardList,
  Check,
  Shield,
  Zap,
  BarChart3,
  Sparkles,
} from "lucide-react";

const fadeInUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.5 },
};

const stagger = {
  animate: {
    transition: {
      staggerChildren: 0.1,
    },
  },
};

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="fixed top-0 w-full bg-white/80 backdrop-blur-md border-b border-gray-100 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-indigo-500 rounded-lg flex items-center justify-center">
                <Users className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold text-gray-900">
                BucketCrew
              </span>
            </div>
            <div className="hidden md:flex items-center gap-8">
              <a
                href="#how-it-works"
                className="text-sm text-gray-600 hover:text-gray-900"
              >
                How it works
              </a>
              <a
                href="#teammates"
                className="text-sm text-gray-600 hover:text-gray-900"
              >
                TeamMates
              </a>
              <a
                href="#pricing"
                className="text-sm text-gray-600 hover:text-gray-900"
              >
                Pricing
              </a>
              <Link
                href="/login"
                className="text-sm text-gray-600 hover:text-gray-900"
              >
                Log in
              </Link>
              <Link
                href="/signup"
                className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-500 text-white text-sm font-medium rounded-lg hover:bg-indigo-600 transition-colors"
              >
                Start Free
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="pt-32 pb-20 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-indigo-50 text-indigo-700 text-sm font-medium rounded-full mb-6">
              <Sparkles className="w-4 h-4" />
              AI-powered business consulting
            </div>
            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold text-gray-900 tracking-tight leading-tight">
              Your business deserves
              <br />
              <span className="text-indigo-500">a team.</span> Not another
              chatbot.
            </h1>
            <p className="mt-6 text-xl text-gray-600 max-w-2xl mx-auto leading-relaxed">
              Upload your files. Pick a goal. Get a polished deliverable in
              minutes — like hiring a consulting team, without the consulting
              fees.
            </p>
            <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                href="/signup"
                className="inline-flex items-center gap-2 px-8 py-4 bg-indigo-500 text-white text-lg font-semibold rounded-xl hover:bg-indigo-600 transition-all hover:shadow-lg hover:shadow-indigo-200"
              >
                Start Free
                <ArrowRight className="w-5 h-5" />
              </Link>
              <p className="text-sm text-gray-500">
                3 free workflow runs. No credit card required.
              </p>
            </div>
          </motion.div>

          {/* Hero Visual */}
          <motion.div
            className="mt-16 relative"
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
          >
            <div className="bg-gradient-to-b from-gray-50 to-white rounded-2xl border border-gray-200 shadow-2xl shadow-gray-200/50 p-8 max-w-3xl mx-auto">
              <div className="flex items-center gap-3 mb-6">
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-red-400" />
                  <div className="w-3 h-3 rounded-full bg-yellow-400" />
                  <div className="w-3 h-3 rounded-full bg-green-400" />
                </div>
                <div className="text-sm text-gray-400 font-mono">
                  BucketCrew — Acme Plumbing
                </div>
              </div>
              <div className="space-y-3">
                <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg border border-green-200">
                  <Check className="w-5 h-5 text-green-600" />
                  <span className="text-sm font-medium text-green-800">
                    Planner — Analyzed your goal and 8 bucket files
                  </span>
                  <span className="text-xs text-green-600 ml-auto">12s</span>
                </div>
                <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg border border-green-200">
                  <Check className="w-5 h-5 text-green-600" />
                  <span className="text-sm font-medium text-green-800">
                    Researcher — Found 14 key data points from your files
                  </span>
                  <span className="text-xs text-green-600 ml-auto">28s</span>
                </div>
                <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg border border-blue-200 animate-pulse">
                  <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                  <span className="text-sm font-medium text-blue-800">
                    Strategist — Building your 90-day growth plan...
                  </span>
                </div>
                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
                  <div className="w-5 h-5 rounded-full border-2 border-gray-300" />
                  <span className="text-sm text-gray-500">
                    Editor — Waiting
                  </span>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="py-24 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            className="text-center mb-16"
            variants={fadeInUp}
            initial="initial"
            whileInView="animate"
            viewport={{ once: true }}
          >
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900">
              Three steps. Zero prompts.
            </h2>
            <p className="mt-4 text-lg text-gray-600">
              No AI jargon. No prompt engineering. Just outcomes.
            </p>
          </motion.div>

          <motion.div
            className="grid md:grid-cols-3 gap-8"
            variants={stagger}
            initial="initial"
            whileInView="animate"
            viewport={{ once: true }}
          >
            {[
              {
                icon: Upload,
                title: "Drop files into your Business Bucket",
                description:
                  "Upload your PDFs, spreadsheets, docs — anything about your business. Tag them by department. Done.",
                step: "01",
              },
              {
                icon: Users,
                title: "Pick a TeamMate",
                description:
                  "Choose from pre-built workflows: market research, growth planning, SOP documentation. Each one runs a team of AI specialists.",
                step: "02",
              },
              {
                icon: FileText,
                title: "Get a real deliverable",
                description:
                  "Not a chat response. A structured, skimmable, action-ready document with executive summary, recommendations, and a TODO checklist.",
                step: "03",
              },
            ].map((item, i) => (
              <motion.div
                key={i}
                variants={fadeInUp}
                className="relative p-8 bg-white rounded-2xl border border-gray-200 hover:border-indigo-200 hover:shadow-lg transition-all"
              >
                <div className="text-6xl font-bold text-gray-100 absolute top-4 right-6">
                  {item.step}
                </div>
                <div className="w-12 h-12 bg-indigo-100 rounded-xl flex items-center justify-center mb-4">
                  <item.icon className="w-6 h-6 text-indigo-600" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  {item.title}
                </h3>
                <p className="text-gray-600">{item.description}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* TeamMates Showcase */}
      <section id="teammates" className="py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            className="text-center mb-16"
            variants={fadeInUp}
            initial="initial"
            whileInView="animate"
            viewport={{ once: true }}
          >
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900">
              Meet your TeamMates
            </h2>
            <p className="mt-4 text-lg text-gray-600">
              Pre-built workflows that deliver real business results.
            </p>
          </motion.div>

          <motion.div
            className="grid md:grid-cols-3 gap-8"
            variants={stagger}
            initial="initial"
            whileInView="animate"
            viewport={{ once: true }}
          >
            {[
              {
                icon: Search,
                name: "Research Sprint",
                tagline: "Know your market in minutes, not months.",
                description:
                  "Your research team scans your business files, analyzes competitors, and maps customer segments — then hands you a briefing doc.",
                features: [
                  "Market landscape overview",
                  "Competitor profiles",
                  "Customer segments",
                  "Opportunity gaps",
                ],
                color: "blue",
              },
              {
                icon: TrendingUp,
                name: "90-Day Growth Plan",
                tagline: "A strategic plan. Not a to-do list.",
                description:
                  "Your strategy team builds a prioritized growth plan with channels, offers, experiments, and KPIs — calibrated to your business data.",
                features: [
                  "Channel strategy",
                  "30/60/90 milestones",
                  "Experiment ideas",
                  "KPI framework",
                ],
                color: "green",
              },
              {
                icon: ClipboardList,
                name: "SOP Builder",
                tagline: "Turn tribal knowledge into real processes.",
                description:
                  "Your operations team reads your docs and outputs clean, standardized procedures your team can actually follow.",
                features: [
                  "Step-by-step workflows",
                  "Role assignments",
                  "Quality checkpoints",
                  "Training checklist",
                ],
                color: "purple",
              },
            ].map((mate, i) => (
              <motion.div
                key={i}
                variants={fadeInUp}
                className="flex flex-col p-8 bg-white rounded-2xl border border-gray-200 hover:border-indigo-200 hover:shadow-lg transition-all"
              >
                <div
                  className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 ${
                    mate.color === "blue"
                      ? "bg-blue-100"
                      : mate.color === "green"
                      ? "bg-green-100"
                      : "bg-purple-100"
                  }`}
                >
                  <mate.icon
                    className={`w-6 h-6 ${
                      mate.color === "blue"
                        ? "text-blue-600"
                        : mate.color === "green"
                        ? "text-green-600"
                        : "text-purple-600"
                    }`}
                  />
                </div>
                <h3 className="text-xl font-semibold text-gray-900">
                  {mate.name}
                </h3>
                <p className="text-sm font-medium text-indigo-600 mt-1">
                  {mate.tagline}
                </p>
                <p className="text-gray-600 mt-3 flex-grow">
                  {mate.description}
                </p>
                <div className="mt-6 space-y-2">
                  {mate.features.map((f, j) => (
                    <div key={j} className="flex items-center gap-2 text-sm">
                      <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
                      <span className="text-gray-700">{f}</span>
                    </div>
                  ))}
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Trust Section */}
      <section className="py-24 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            className="text-center mb-16"
            variants={fadeInUp}
            initial="initial"
            whileInView="animate"
            viewport={{ once: true }}
          >
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900">
              Built for business owners who&apos;d rather run their business
              <br />
              than wrestle with AI.
            </h2>
          </motion.div>
          <motion.div
            className="grid md:grid-cols-3 gap-8"
            variants={stagger}
            initial="initial"
            whileInView="animate"
            viewport={{ once: true }}
          >
            {[
              {
                icon: Shield,
                title: "Your data stays yours",
                description:
                  "Files are encrypted, workspace-isolated, and deletable anytime. You control your data retention.",
              },
              {
                icon: Zap,
                title: "No prompt engineering",
                description:
                  "We handle the AI. You handle the business. Fill in a simple form and let your team do the work.",
              },
              {
                icon: BarChart3,
                title: "Structured outputs",
                description:
                  "Every deliverable is formatted, cited, and exportable. Not chat bubbles — real documents.",
              },
            ].map((item, i) => (
              <motion.div
                key={i}
                variants={fadeInUp}
                className="text-center p-8"
              >
                <div className="w-12 h-12 bg-indigo-100 rounded-xl flex items-center justify-center mx-auto mb-4">
                  <item.icon className="w-6 h-6 text-indigo-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  {item.title}
                </h3>
                <p className="text-gray-600">{item.description}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            className="text-center mb-16"
            variants={fadeInUp}
            initial="initial"
            whileInView="animate"
            viewport={{ once: true }}
          >
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900">
              Plans that make consultants nervous.
            </h2>
            <p className="mt-4 text-lg text-gray-600">
              No contracts. Cancel anytime.
            </p>
          </motion.div>

          <motion.div
            className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto"
            variants={stagger}
            initial="initial"
            whileInView="animate"
            viewport={{ once: true }}
          >
            {[
              {
                name: "Free",
                price: "$0",
                period: "/mo",
                description: "Perfect for trying it out",
                features: [
                  "3 workflow runs per month",
                  "500MB file storage",
                  "All 3 TeamMates",
                  "PDF export",
                ],
                cta: "Start Free",
                highlighted: false,
              },
              {
                name: "Pro",
                price: "$29",
                period: "/mo",
                description: "For serious operators",
                features: [
                  "50 workflow runs per month",
                  "2GB file storage",
                  "All TeamMates",
                  "PDF + DOCX export",
                  "Web research enabled",
                  "Priority processing",
                ],
                cta: "Start Pro Trial",
                highlighted: true,
              },
              {
                name: "Business",
                price: "$79",
                period: "/mo",
                description: "For growing teams",
                features: [
                  "200 workflow runs per month",
                  "10GB file storage",
                  "All TeamMates",
                  "All export formats",
                  "Web research enabled",
                  "Priority processing",
                  "Custom tags (coming soon)",
                ],
                cta: "Start Business Trial",
                highlighted: false,
              },
            ].map((plan, i) => (
              <motion.div
                key={i}
                variants={fadeInUp}
                className={`relative flex flex-col p-8 rounded-2xl border ${
                  plan.highlighted
                    ? "border-indigo-500 shadow-xl shadow-indigo-100 scale-105"
                    : "border-gray-200"
                }`}
              >
                {plan.highlighted && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 bg-indigo-500 text-white text-sm font-medium rounded-full">
                    Most popular
                  </div>
                )}
                <h3 className="text-lg font-semibold text-gray-900">
                  {plan.name}
                </h3>
                <div className="mt-4 flex items-baseline">
                  <span className="text-4xl font-bold text-gray-900">
                    {plan.price}
                  </span>
                  <span className="text-gray-500 ml-1">{plan.period}</span>
                </div>
                <p className="mt-2 text-sm text-gray-500">
                  {plan.description}
                </p>
                <div className="mt-8 space-y-3 flex-grow">
                  {plan.features.map((f, j) => (
                    <div key={j} className="flex items-center gap-2 text-sm">
                      <Check className="w-4 h-4 text-indigo-500 flex-shrink-0" />
                      <span className="text-gray-700">{f}</span>
                    </div>
                  ))}
                </div>
                <Link
                  href="/signup"
                  className={`mt-8 block text-center px-6 py-3 rounded-xl font-semibold transition-colors ${
                    plan.highlighted
                      ? "bg-indigo-500 text-white hover:bg-indigo-600"
                      : "bg-gray-100 text-gray-900 hover:bg-gray-200"
                  }`}
                >
                  {plan.cta}
                </Link>
              </motion.div>
            ))}
          </motion.div>
          <p className="text-center text-sm text-gray-500 mt-8">
            All plans include workspace isolation, data encryption, and the
            ability to delete your data at any time.
          </p>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-24 bg-indigo-600">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <motion.div
            variants={fadeInUp}
            initial="initial"
            whileInView="animate"
            viewport={{ once: true }}
          >
            <h2 className="text-3xl sm:text-4xl font-bold text-white">
              Stop chatting. Start shipping.
            </h2>
            <p className="mt-4 text-xl text-indigo-200">
              Your first 3 workflow runs are free. No credit card required.
            </p>
            <Link
              href="/signup"
              className="mt-8 inline-flex items-center gap-2 px-8 py-4 bg-white text-indigo-600 text-lg font-semibold rounded-xl hover:bg-indigo-50 transition-colors"
            >
              Create Your Team
              <ArrowRight className="w-5 h-5" />
            </Link>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 border-t border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 bg-indigo-500 rounded flex items-center justify-center">
                <Users className="w-4 h-4 text-white" />
              </div>
              <span className="font-semibold text-gray-900">BucketCrew</span>
              <span className="text-sm text-gray-500">
                — AI teammates for small business.
              </span>
            </div>
            <div className="flex items-center gap-6 text-sm text-gray-500">
              <a href="#" className="hover:text-gray-900">
                Privacy
              </a>
              <a href="#" className="hover:text-gray-900">
                Terms
              </a>
              <a href="#" className="hover:text-gray-900">
                Contact
              </a>
              <span>&copy; 2025 BucketCrew</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
