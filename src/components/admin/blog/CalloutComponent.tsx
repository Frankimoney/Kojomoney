import { NodeViewWrapper, NodeViewContent } from '@tiptap/react'
import { Rocket, AlertTriangle, Lightbulb, Info, Coins, Zap } from 'lucide-react'

const CalloutComponent = (props: any) => {
    const type = props.node.attrs.type || 'info'

    const config = {
        bonus: {
            icon: Coins,
            color: 'bg-gradient-to-r from-amber-100 to-yellow-100 dark:from-amber-900/30 dark:to-yellow-900/30',
            borderColor: 'border-amber-300 dark:border-amber-700',
            iconColor: 'text-amber-600 dark:text-amber-400',
            textColor: 'text-amber-900 dark:text-amber-100',
            label: 'Double Points!'
        },
        alert: {
            icon: AlertTriangle,
            color: 'bg-red-50 dark:bg-red-950/30',
            borderColor: 'border-red-200 dark:border-red-800',
            iconColor: 'text-red-500 dark:text-red-400',
            textColor: 'text-red-900 dark:text-red-100',
            label: 'Important Alert'
        },
        tip: {
            icon: Lightbulb,
            color: 'bg-emerald-50 dark:bg-emerald-950/30',
            borderColor: 'border-emerald-200 dark:border-emerald-800',
            iconColor: 'text-emerald-500 dark:text-emerald-400',
            textColor: 'text-emerald-900 dark:text-emerald-100',
            label: 'Pro Tip'
        },
        info: {
            icon: Info,
            color: 'bg-blue-50 dark:bg-blue-950/30',
            borderColor: 'border-blue-200 dark:border-blue-800',
            iconColor: 'text-blue-500 dark:text-blue-400',
            textColor: 'text-blue-900 dark:text-blue-100',
            label: 'Did You Know?'
        }
    }

    const { icon: Icon, color, borderColor, iconColor, textColor, label } = config[type as keyof typeof config]

    return (
        <NodeViewWrapper className={`my-6 rounded-xl border-l-4 p-4 sm:p-5 shadow-sm ${color} ${borderColor}`}>
            <div className="flex items-start gap-4">
                <div className={`p-2 rounded-lg bg-white/50 dark:bg-black/20 ${iconColor} flex-shrink-0`}>
                    <Icon className="h-5 w-5 sm:h-6 sm:w-6" />
                </div>
                <div className="flex-1 space-y-1">
                    <div className={`text-xs font-bold uppercase tracking-wider opacity-70 mb-1 flex items-center gap-2 ${textColor}`}>
                        {type === 'bonus' && <Zap className="h-3 w-3 animate-pulse" />}
                        {label}
                    </div>
                    <div className={`prose prose-sm dark:prose-invert max-w-none ${textColor} [&_p]:m-0 [&_a]:underline`}>
                        <NodeViewContent />
                    </div>
                </div>
            </div>
        </NodeViewWrapper>
    )
}

export default CalloutComponent
