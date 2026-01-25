import { Node, mergeAttributes } from '@tiptap/core'
import { ReactNodeViewRenderer } from '@tiptap/react'
import CalloutComponent from './CalloutComponent'

declare module '@tiptap/core' {
    interface Commands<ReturnType> {
        callout: {
            setCallout: (options: { type: 'bonus' | 'alert' | 'tip' | 'info' }) => ReturnType
            toggleCallout: (options: { type: 'bonus' | 'alert' | 'tip' | 'info' }) => ReturnType
        }
    }
}

export const CalloutExtension = Node.create({
    name: 'callout',

    group: 'block',

    content: 'block+',

    draggable: true,

    addAttributes() {
        return {
            type: {
                default: 'info',
            },
        }
    },

    parseHTML() {
        return [
            {
                tag: 'div[data-type="callout"]',
            },
        ]
    },

    renderHTML({ HTMLAttributes }) {
        return ['div', mergeAttributes(HTMLAttributes, { 'data-type': 'callout' }), 0]
    },

    addCommands() {
        return {
            setCallout:
                (attributes) =>
                    ({ commands, state }) => {
                        const { selection } = state
                        if (selection.empty) {
                            return commands.insertContent({
                                type: this.name,
                                attrs: attributes,
                                content: [{ type: 'paragraph' }]
                            })
                        }
                        return commands.wrapIn(this.name, attributes)
                    },
            toggleCallout:
                (attributes) =>
                    ({ commands }) => {
                        return commands.toggleWrap(this.name, attributes)
                    },
        }
    },

    addNodeView() {
        return ReactNodeViewRenderer(CalloutComponent)
    },
})
