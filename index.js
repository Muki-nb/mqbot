const WebSocket = require("ws");

const eventTypes = ["message","request","notice"];

class Bot{
	config;
	address;
	port;
	ws;
	constructor(config){
		this.config = {
			address: "ws://0.0.0.0",
			port: 8080,
			whiteUserList: [],
			blackUserList: [],
			whiteGroupList: [],
			blackGroupList: [],
			...config
		};
		
		this.address = this.config.address;
		this.port = this.config.port;
		this.ws = new WebSocket(`${this.address}:${this.port}`);
		
		this.ws.open = ()=>this.open();
		this.ws.onmessage = (e)=>this.onMessage(e);
	}
	open(){
		console.log("BOT: OPEN");
	}
	events = {
		message: [],
		request: [],
		notice: []
	};
	on(str,func){
		if(!eventTypes.includes(str)){
			console.error("str can only be 'message','request' and 'notice'.");
			return;
		}
		if(typeof(func) != "function"){
			console.error("func is not a function.");
			return;
		}
		this.events[str].push(func);
	}
	onMessage(e){
		let data = JSON.parse(e.data);
		try{
			data.message = data.message.trim();
		}catch(e){
			
		}
		
		let type = data.post_type;
		let grouptype = data.message_type;
		if(type == "message" && grouptype == "group"){
			if(this.config.whiteGroupList.length > 0){
				if(!this.config.whiteGroupList.includes(data.group_id) && !this.config.whiteUserList.includes(data.user_id)){
					return;
				}
			}
			if(this.config.blackGroupList.includes(data.group_id)) return;
		}
		if(type == "message" && grouptype == "private"){
			if(this.config.whiteUserList.length > 0){
				if(!this.config.whiteUserList.includes(data.user_id)){
					return;
				}
			}
		}
		
		if(type == "message" && this.config.blackUserList.includes(data.user_id)) return;
		
		if(eventTypes.includes(type)){
			let length = this.events[type].length;
			for(let i = 0;i < length;i++){
				this.events[type][i](data);
			}
		}
	}
	send(data){
		this.ws.send(JSON.stringify(data));
	}
	sendGroupMsg(group_id,message,auto_escape = false){
		this.send({
			"action":"send_group_msg",
			"params":{
				group_id,
				message,
				auto_escape
			},
			"echo":""
		});
		console.log(`BOT in group:${group_id}:${message}`);
	}
	sendPrivateMsg(user_id,message,auto_escape = false){
		this.send({
			"action":"send_private_msg",
			"params":{
				user_id,
				message,
				auto_escape
			},
			"echo":""
		});
		console.log(`BOT in qq:${user_id}:${message}`);
	}
	reply(data,message,auto_escape = false){
		let action = data.message_type == "group" ? "sendGroupMsg" : "sendPrivateMsg";
		let id = data.message_type == "group" ? data.group_id : data.user_id;
		this[action](id,message,auto_escape);
	}
}

module.exports = Bot;