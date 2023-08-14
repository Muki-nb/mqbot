# mqbot
a qqbot tool based on go-cqhttp and nodejs

##How to use
- 下载 [go-cqhttp](https://github.com/Mrs4s/go-cqhttp/releases) ，运行时请启用**正向ws**模式。
- 根据 go-cqhttp 进行配置。
- 运行你的机器人脚本。

## Install
`npm install mqbot`

## Example
```js
const Bot = require("mqbot");

let bot = new Bot({
    port:8080
});

bot.on("message",(data)=>{
    let message = data.message;
    if(message == "ping") bot.reply(data,"pong!");
});
```

## Config
`let bot = new Bot(config);`
|Key|Value|Default|
|----|----|----|
|address|go-cqhttp中WebSocket的地址|`"ws://0.0.0.0"`|
|port|go-cqhttp中WebSocket的端口|`8080`|
|whiteUserList|用户白名单，空列表表示不启用|`[]`|
|whiteGroupList|群组白名单，空列表表示不启用|`[]`|
|blackUserList|用户黑名单|`[]`|
|blackGroupList|群组黑名单|`[]`|

- 黑名单群组和成员不响应message事件，即便在白名单群组。
- 群组白名单启用时，仅白名单群组会响应message事件。
- 用户白名单启用时，仅白名单用户会响应message事件。
- 二者均启用时，群组白名单中的任何非黑名单用户都会响应message事件。而白名单用户在任何非黑名单群组都会响应message事件。