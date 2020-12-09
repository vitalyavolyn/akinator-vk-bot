const { VK, Keyboard } = require('vk-io')
const { SessionManager } = require('@vk-io/session')
const { Aki } = require('aki-api')

const { token } = require('./config')

const { updates } = new VK({ token })

const sessionManager = new SessionManager();
updates.on('message_new', sessionManager.middleware)

const answers = ['Да', 'Нет', 'Не знаю', 'Возможно / частично', 'Скорее нет']

const sendNextQuestion = (ctx) => ctx.send({
  message: ctx.session.aki.question,
  keyboard: Keyboard.keyboard(
    answers.map(e => Keyboard.textButton({ label: e }))
  )
})

updates.on('message_new', async (ctx, next) => {
  const { aki } = ctx.session
  if (!aki) return next()

  const answer = answers.indexOf(ctx.text)
  if (answers === -1) return sendNextQuestion(ctx)

  await aki.step(answer)
  if (aki.progress >= 85) {
    await aki.win()
    const [answer] = aki.answers

    await ctx.sendPhotos({ value: answer.absolute_picture_path }, {
      message: `Это ${answer.name} (${answer.description})?`,
      keyboard: Keyboard.builder()
        .textButton({ label: 'Да' })
        .textButton({ label: 'Нет' })
    })

    ctx.session.aki = null
  } else {
    sendNextQuestion(ctx)
  }
})

updates.on('message_new', async ctx => {
  if (['Да', 'Нет'].includes(ctx.text)) {
    let text = ctx.text === 'Да' ? 'Ура! Я выиграл 😌' : 'Кажется, ты победил!'
    text += '\n\nНапиши любое сообщение, чтобы начать новую игру'

    return ctx.send(text, { keyboard: Keyboard.keyboard([]) })
  }

  ctx.session.aki = new Aki('ru')
  await ctx.session.aki.start()
  await ctx.send('Игра началась!')
  sendNextQuestion(ctx)
})

updates.start()
