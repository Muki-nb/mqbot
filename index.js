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
		
		this.ws.on("open",()=>{
			this.open();
		});
		this.ws.onmessage = (e)=>{
			this.onMessage(e)
		};
	}
	open(){
		console.log("Bot: OPEN");
	}

	events = {

	};
	on(eventName,callback){
		/*
		if(!eventTypes.includes(str)){
			console.error("str can only be 'message','request' and 'notice'.");
			return;
		}
		*/
		if(typeof(callback) != "function"){
			console.error("callback is not a function.");
			return;
		}
		if(!(eventName in this.events)) this.events[eventName] = [];
		this.events[eventName].push(callback);
	}
	off(eventName){
		if(eventName in this.events) this.events[eventName] = [];
	}

	ignore(data){
		let type = data.post_type;
		let grouptype = data.message_type;
		if(type == "message" && grouptype == "group"){
			if(this.config.whiteGroupList.length > 0){
				if(!this.config.whiteGroupList.includes(data.group_id) && !this.config.whiteUserList.includes(data.user_id)){
					return true;
				}
			}
			if(this.config.blackGroupList.includes(data.group_id)) return true;
		}
		if(type == "message" && grouptype == "private"){
			if(this.config.whiteUserList.length > 0){
				if(!this.config.whiteUserList.includes(data.user_id)){
					return true;
				}
			}
		}
		return false;
	}
	
	onMessage(e){
		let data;
		if(e.data == undefined) return;
		try{
			data = JSON.parse(e.data);
		}catch(err){
			console.log(e.data);
			return;
		}
		try{
			data.message = data.message.trim();
		}catch(err){
			
		}

		//get echo
		if("echo" in data){
			this.echo(data);
			return;
		}

		let post_type = data.post_type;
		let second_type = data[post_type + "_type"];
		let sub_type = data.sub_type;
		
		if(this.ignore(data)) return;

		this.emit(post_type,data);
		this.emit(`${post_type}.${second_type}`,data);
		if("sub_type" in data) this.emit(`${post_type}.${second_type}.${sub_type}`,data);

		//whitelist & blacklist

		/*
		let type = data.post_type;
		if(eventTypes.includes(type)){
			let length = this.events[type].length;
			for(let i = 0;i < length;i++){
				this.events[type][i](data);
			}
		}
		*/
	}
	emit(eventName,data){
		if(!(eventName in this.events)) return;
		let length = this.events[eventName].length;
		for(let i = 0;i < length;i++){
			this.events[eventName][i](data);
		}
	}

	send(data){
		this.ws.send(JSON.stringify(data));
	}

	//Echo
	echoes = {};
	echo(data){
		let id = data.echo;
		if(id in this.echoes){
			if(typeof this.echoes[id] == "function"){
				this.echoes[id](data);
			}
			delete this.echoes[id];
		}
	}
	callEcho(echoid,func = ()=>{}){
		return new Promise((resolve,reject) => {
			this.setEcho(echoid, (data)=>{
				if(data.status == "ok"){
					func(data);
					resolve(data.data);
				}else{
					console.log(`Wrong Msg: ${data.msg}`);
					reject();
				}
			});
		});
	}
	setEcho(id,callback){
		this.echoes[id] = callback;
	}
	getEchoId(){
		let result = Math.floor(Math.random()*1e+8);
		while(result in this.echoes) result = Math.floor(Math.random()*1e+8);
		return result;
	}

	buildMessages(arr){
		if(!Array.isArray(arr)){
			console.log("arr is not an Array.");
			return;
		}
		let result = [];
		for(let i = 0;i < arr.length;i++){
			let node = {
				"type":"node",
				"data":{

				}
			}
			if("id" in arr[i]){
				node.data.id = arr[i].id;
				result.push(node);
				continue;
			}else{
				if(!("uin" in arr[i])) continue;
				node.data.uin = arr[i].uin;
				if("content" in arr[i]) node.data.content = arr[i].content;
				if("seq" in arr[i]) node.data.seq = arr[i].seq;
				if("name" in arr[i]) node.data.name = arr[i].name;
				if("time" in arr[i]) node.data.time = arr[i].time;
				result.push(node);
				continue;
			}
		}
		return result;
	}
	
	//Public Actions
	//chat
	sendGroupMsg(group_id,message,auto_escape = false){
		let echoid = this.getEchoId();
		this.send({
			"action":"send_group_msg",
			"params":{
				group_id,
				message,
				auto_escape
			},
			"echo":echoid
		});
		return this.callEcho(echoid,(data)=>{
			let id = data.data.message_id;
			console.log(`Bot in group(${group_id}) sendMsg(id:${id}): ${message}`);
		});
	}
	sendPrivateMsg(user_id,message,auto_escape = false){
		let echoid = this.getEchoId();
		this.send({
			"action":"send_private_msg",
			"params":{
				user_id,
				message,
				auto_escape
			},
			"echo":echoid
		});
		return this.callEcho(echoid,(data)=>{
			let id = data.data.message_id;
			console.log(`Bot in user(${user_id}) sendMsg(id:${id}): ${message}`);
		});
	}
	reply(data,message,auto_escape = false){
		let action = data.message_type == "group" ? "sendGroupMsg" : "sendPrivateMsg";
		let id = data.message_type == "group" ? data.group_id : data.user_id;
		return this[action](id,message,auto_escape);
	}

	sendGroupForwardMsg(group_id,messages){
		let echoid = this.getEchoId();
		this.send({
			"action":"send_group_forward_msg",
			"params":{
				group_id,
				messages
			},
			"echo":echoid
		});
		return this.callEcho(echoid,(data)=>{
			let id = data.data.message_id, forward = data.data.forward_id;
			console.log(`Bot in group(${group_id}) sendMsg(id:${id}): [合并消息:${forward}]`);
		});
	}
	sendPrivateForwardMsg(user_id,messages){
		let echoid = this.getEchoId();
		this.send({
			"action":"send_private_forward_msg",
			"params":{
				user_id,
				messages
			},
			"echo":echoid
		});
		return this.callEcho(echoid,(data)=>{
			let id = data.data.message_id, forward = data.data.forward_id;
			console.log(`Bot in user(${user_id}) sendMsg(id:${id}): [合并消息:${forward}]`);
		});
	}
	replyForwardMsg(data,messages){
		let action = data.message_type == "group" ? "sendGroupForwardMsg" : "sendPrivateForwardMsg";
		let id = data.message_type == "group" ? data.group_id : data.user_id;
		return this[action](id,messages);
	}

	deleteMsg(message_id){
		this.send({
			"action":"delete_msg",
			"params":{
				message_id
			}
		});
	}

	
	//Get
	//chat
	getForwardMsg(message_id){
		let echoid = this.getEchoId();
		this.send({
			"action":"get_forward_msg",
			"params":{
				message_id
			},
			"echo":echoid
		});
		return this.callEcho(echoid);
	}

	//group information
	getFriendList(){
		let echoid = this.getEchoId();
		this.send({
			"action":"get_friend_list",
			"echo":echoid
		});
		return this.callEcho(echoid);
	}

	getGroupList(){
		let echoid = this.getEchoId();
		this.send({
			"action":"get_group_list",
			"echo":echoid
		});
		return this.callEcho(echoid);
	}

	getGroupMemberInfo(group_id, user_id){
		let echoid = this.getEchoId();
		this.send({
			"action":"get_group_member_info",
			"params":{
				group_id,
				user_id
			},
			"echo":echoid
		});
		return this.callEcho(echoid);
	}

	getGroupMemberList(group_id){
		let echoid = this.getEchoId();
		this.send({
			"action":"get_group_member_list",
			"params":{
				group_id
			},
			"echo":echoid
		});
		return this.callEcho(echoid);
	}

	//Set
	//group set
	setGroupAdmin(group_id,user_id,enable = true){
		this.send({
			"action":"set_group_admin",
			"params":{
				group_id,
				user_id,
				enable
			}
		});
	}
	setGroupCard(group_id,user_id,card = ""){
		this.send({
			"action":"set_group_card",
			"params":{
				group_id,
				user_id,
				card
			}
		});
	}
	setGroupSpecialTitle(group_id,user_id,special_title){
		this.send({
			"action":"set_group_special_title",
			"params":{
				group_id,
				user_id,
				special_title
			}
		});
	}
	//Operation
	banGroupUser(group_id,user_id,duration){
		this.send({
			"action":"set_group_ban",
			"params":{
				group_id,
				user_id,
				duration
			}
		});
	}
	banGroup(group_id,enable = true){
		this.send({
			"action":"set_group_whole_ban",
			"params":{
				group_id,
				enable
			}
		});
	}
	kickGroupUser(group_id,user_id,reject_add_request = false){
		this.send({
			"action":"set_group_kick",
			"params":{
				group_id,
				user_id,
				reject_add_request
			}
		});
	}
	leaveGroup(group_id){
		this.send({
			"action":"set_group_leave",
			"params":{
				group_id
			}
		});
	}

	setFriendAddRequest(flag,approve = true,remark = ""){
		this.send({
			"action":"set_friend_add_request",
			"params":{
				flag,
				approve,
				remark
			}
		});
	}
	setGroupAddRequest(flag,sub_type,approve = true,reason = ""){
		this.send({
			"action":"set_group_add_request",
			"params":{
				flag,
				sub_type,
				approve,
				reason
			}
		});
	}
}

module.exports = Bot;