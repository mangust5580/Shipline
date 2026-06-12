import { createContext } from '#gulp/core/context.js'
import { STAGES } from '#gulp/core/stage.js'
import { createWatchTask } from '#gulp/core/watch.js'

export const watchTask = ctx => createWatchTask(ctx ?? createContext({ stage: STAGES.DEV }))
