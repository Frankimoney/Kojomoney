/**
 * E-E-A-T (Experience, Expertise, Authoritativeness, Trustworthiness) Component
 * Displays trust signals to improve content credibility
 */

import { BlogPost, BlogAuthor } from '@/types/blog'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import {
    Shield, CheckCircle2, Award, Clock, ExternalLink,
    Twitter, Linkedin, Globe, Sparkles, BookOpen, FlaskConical,
    UserCheck, AlertCircle
} from 'lucide-react'
import { format } from 'date-fns'
import Link from 'next/link'

interface EEATSignalsProps {
    post: BlogPost
}

// Experience Badge Display
const ExperienceBadge = ({ type }: { type?: BlogPost['experienceBadge'] }) => {
    if (!type) return null

    const badges = {
        'tested': { icon: FlaskConical, label: 'Hands-on Tested', color: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
        'reviewed': { icon: BookOpen, label: 'Expert Reviewed', color: 'bg-blue-100 text-blue-700 border-blue-200' },
        'hands-on': { icon: Sparkles, label: 'First-Hand Experience', color: 'bg-purple-100 text-purple-700 border-purple-200' },
        'expert-written': { icon: Award, label: 'Expert Written', color: 'bg-amber-100 text-amber-700 border-amber-200' }
    }

    const badge = badges[type]
    if (!badge) return null

    const Icon = badge.icon

    return (
        <Badge className={`${badge.color} border gap-1.5 px-3 py-1`}>
            <Icon className="h-3.5 w-3.5" />
            {badge.label}
        </Badge>
    )
}

// Trust Signals Bar (appears above article)
export function TrustSignalsBar({ post }: EEATSignalsProps) {
    return (
        <div className="flex flex-wrap items-center gap-3 mb-6 text-sm">
            {/* Experience Badge */}
            <ExperienceBadge type={post.experienceBadge} />

            {/* Fact Checked */}
            {post.factCheckedBy && (
                <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
                    <CheckCircle2 className="h-4 w-4" />
                    <span>Fact-checked by {post.factCheckedBy}</span>
                </div>
            )}

            {/* Last Reviewed */}
            {post.lastReviewedAt && (
                <div className="flex items-center gap-1.5 text-muted-foreground">
                    <Clock className="h-4 w-4" />
                    <span>Reviewed {format(new Date(post.lastReviewedAt), 'MMM d, yyyy')}</span>
                </div>
            )}
        </div>
    )
}

// Enhanced Author Box with E-E-A-T Info
export function EnhancedAuthorBox({ author, post }: { author?: BlogAuthor; post: BlogPost }) {
    if (!author) {
        author = { id: 'admin', name: 'KojoMoney Team' }
    }

    return (
        <Card className="p-6 sm:p-8 mt-12 bg-gradient-to-br from-slate-50 to-slate-100/50 dark:from-slate-900 dark:to-slate-800/50 border">
            <div className="flex flex-col md:flex-row gap-6 items-center md:items-start">
                {/* Avatar */}
                <div className="relative">
                    <div className="w-24 h-24 rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 p-0.5">
                        <div className="w-full h-full rounded-full bg-white dark:bg-slate-900 overflow-hidden">
                            {author.avatar ? (
                                <img src={author.avatar} alt={author.name} className="w-full h-full object-cover" />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center text-3xl font-bold text-slate-400">
                                    {author.name.charAt(0)}
                                </div>
                            )}
                        </div>
                    </div>
                    {author.verified && (
                        <div className="absolute -bottom-1 -right-1 bg-blue-500 rounded-full p-1.5">
                            <CheckCircle2 className="h-4 w-4 text-white" />
                        </div>
                    )}
                </div>

                {/* Info */}
                <div className="flex-1 text-center md:text-left">
                    <div className="flex flex-col md:flex-row md:items-center gap-2 mb-2">
                        <h3 className="text-xl font-bold">{author.name}</h3>
                        {author.verified && (
                            <Badge variant="secondary" className="w-fit mx-auto md:mx-0">
                                <UserCheck className="h-3 w-3 mr-1" /> Verified Author
                            </Badge>
                        )}
                    </div>

                    {/* Credentials */}
                    {author.credentials && (
                        <p className="text-sm font-medium text-violet-600 dark:text-violet-400 mb-2">
                            {author.credentials}
                        </p>
                    )}

                    {/* Bio */}
                    <p className="text-muted-foreground mb-4">
                        {author.bio || "Expert writer for KojoMoney, sharing the best tips on earning online."}
                    </p>

                    {/* Expertise Tags */}
                    {author.expertise && author.expertise.length > 0 && (
                        <div className="flex flex-wrap gap-2 mb-4 justify-center md:justify-start">
                            {author.expertise.map((skill, i) => (
                                <Badge key={i} variant="outline" className="text-xs">
                                    {skill}
                                </Badge>
                            ))}
                        </div>
                    )}

                    {/* Social Links & Experience */}
                    <div className="flex flex-wrap items-center gap-4 justify-center md:justify-start">
                        {author.yearsExperience && (
                            <span className="text-sm text-muted-foreground flex items-center gap-1">
                                <Award className="h-4 w-4" />
                                {author.yearsExperience}+ years experience
                            </span>
                        )}
                        {author.socialLinks?.twitter && (
                            <a
                                href={author.socialLinks.twitter}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-muted-foreground hover:text-blue-500 transition-colors"
                            >
                                <Twitter className="h-5 w-5" />
                            </a>
                        )}
                        {author.socialLinks?.linkedin && (
                            <a
                                href={author.socialLinks.linkedin}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-muted-foreground hover:text-blue-600 transition-colors"
                            >
                                <Linkedin className="h-5 w-5" />
                            </a>
                        )}
                        {author.socialLinks?.website && (
                            <a
                                href={author.socialLinks.website}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-muted-foreground hover:text-violet-600 transition-colors"
                            >
                                <Globe className="h-5 w-5" />
                            </a>
                        )}
                    </div>
                </div>
            </div>
        </Card>
    )
}

// Sources/Citations Section
export function SourcesCitations({ sources }: { sources?: { title: string; url: string }[] }) {
    if (!sources || sources.length === 0) return null

    return (
        <div className="mt-10 pt-6 border-t">
            <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                <BookOpen className="h-5 w-5" />
                Sources & References
            </h3>
            <ul className="space-y-2">
                {sources.map((source, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm">
                        <span className="text-muted-foreground">[{i + 1}]</span>
                        <a
                            href={source.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-violet-600 dark:text-violet-400 hover:underline flex items-center gap-1"
                        >
                            {source.title}
                            <ExternalLink className="h-3 w-3" />
                        </a>
                    </li>
                ))}
            </ul>
        </div>
    )
}

// Editorial Disclosure Box
export function EditorialDisclosure({ post }: EEATSignalsProps) {
    if (!post.disclosures && !post.editorialNote) return null

    return (
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4 mb-8">
            <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
                <div className="text-sm">
                    {post.editorialNote && (
                        <p className="font-medium text-amber-800 dark:text-amber-200 mb-1">
                            Editorial Note
                        </p>
                    )}
                    <p className="text-amber-700 dark:text-amber-300">
                        {post.editorialNote || post.disclosures}
                    </p>
                </div>
            </div>
        </div>
    )
}

// Article Meta Footer (Fact-check, Last Updated, etc.)
export function ArticleMetaFooter({ post }: EEATSignalsProps) {
    return (
        <div className="mt-10 pt-6 border-t border-dashed text-sm text-muted-foreground space-y-2">
            <div className="flex flex-wrap gap-x-6 gap-y-2">
                {post.publishedAt && (
                    <div className="flex items-center gap-1.5">
                        <span className="font-medium">Published:</span>
                        {format(new Date(post.publishedAt), 'MMMM d, yyyy')}
                    </div>
                )}
                {post.updatedAt && post.updatedAt !== post.publishedAt && (
                    <div className="flex items-center gap-1.5">
                        <span className="font-medium">Updated:</span>
                        {format(new Date(post.updatedAt), 'MMMM d, yyyy')}
                    </div>
                )}
                {post.lastReviewedAt && (
                    <div className="flex items-center gap-1.5">
                        <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                        <span className="font-medium">Last Reviewed:</span>
                        {format(new Date(post.lastReviewedAt), 'MMMM d, yyyy')}
                        {post.reviewedBy && ` by ${post.reviewedBy}`}
                    </div>
                )}
            </div>
            {post.factCheckedBy && (
                <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
                    <Shield className="h-4 w-4" />
                    <span>This article has been fact-checked by {post.factCheckedBy}</span>
                    {post.factCheckedAt && ` on ${format(new Date(post.factCheckedAt), 'MMM d, yyyy')}`}
                </div>
            )}
        </div>
    )
}

// Complete E-E-A-T Section Export
export default function EEATSignals({ post }: EEATSignalsProps) {
    return (
        <>
            <TrustSignalsBar post={post} />
            <EditorialDisclosure post={post} />
        </>
    )
}
