import React, {useContext, useEffect, useState} from 'react';
import {useNavigate, useParams} from "react-router-dom";
import {useDispatch, useSelector} from "react-redux";
import {fetchCurrentChatFriendProfileAction, fetchUsersAction} from "../redux/actions/usersAction";
import getFirstLetter from "../utils/getFirstLetter";
import {BiSend, HiEllipsisVertical} from "react-icons/all";
import {fetchMessageAction} from "../redux/actions/messageAction";
import {addMessageAction} from "../redux/ slices/authSlice";
import {io} from "socket.io-client";


const Messenger = () => {
    const {friendId} = useParams()
    const dispatch = useDispatch()
    const [room, setRoom] = useState("")

    const {auth, currentChatFriend, messages, users} = useSelector(state => state.authState)

    const navigate = useNavigate()

    let [messengerNsp, setMessengerNsp ] = useState()


    // fetch old message
    useEffect(() => {
        if (auth && friendId) {
            let roomId = (auth.id + friendId).split("").sort().join("")
            setRoom(roomId)
            dispatch(fetchMessageAction(roomId))
        }

        if (friendId) {
            dispatch(fetchCurrentChatFriendProfileAction(friendId))
        }

    }, [friendId, auth])


    // join private group for one to one
    useEffect(() => {
        let socket;
        if(!socket){
            socket = io("http://localhost:2000/messenger")
            setMessengerNsp(socket)
        } else {
            socket = messengerNsp
        }

        if (socket && room) {
            socket.emit("join-private-room", room)
        }

        if(socket){
            // received message event listener
            socket.on("received-msg", ({senderId, roomId, text}) => {
                dispatch(addMessageAction({
                    senderId,
                    roomId,
                    text,
                    user: {
                        id: auth.id,
                        username: auth.username
                    }
                }))
            })
        }

        return ()=>{
            // clear event listener
            if(socket){
                socket.emit("leave-private-room", room)
                socket.off('connect');
                socket.off('disconnect');
                socket.off('received-msg');
                socket.off('join-private-room');
            }
        }

    }, [ room])




    // fetch all users
    useEffect(() => {
        dispatch(fetchUsersAction())
    }, [])


    function handleSendMessage(e) {
        e.preventDefault()

        let value = e.target.message.value

        if (!room && !messengerNsp) return alert("No room selected")

        // send message to server to broadcast to other participant
        messengerNsp.emit("send-message", {
            text: value,
            roomId: room,
            senderId: auth.id
        })
        e.target.message.value = ""
    }


    function startOneToOneChat(user) {
        navigate("/messenger/" + user.id)
    }

    function isYour(msg) {
        return msg.senderId === auth.id
    }

    return (
        <div className="container">
            <div className="messenger">
                <div className="message-sidebar">
                    <h2 className="text-xl font-semibold px-4 py-4">Friends</h2>

                    <ul>
                        {users.map(user => (!auth || auth.id !== user.id) && (
                            <div className="list-item" onClick={() => startOneToOneChat(user)}>
                                <div className="circle">{getFirstLetter(user.username)}</div>
                                <div className="">{user.username}</div>

                                <span className={`bullet ${user.isOnline ? "active" : "inactive"}`}></span>
                            </div>
                        ))}
                    </ul>

                </div>
                <div className="chatting-box">
                    {friendId ? (
                        <div>


                            <div>
                                {currentChatFriend && (
                                    <div className="flex justify-between items-center bg-dark-30 rounded-lg px-4">
                                        <div className="list-item">
                                            <div className="circle">{getFirstLetter(currentChatFriend.username)}</div>
                                            <div className="text-3xl font-semibold">{currentChatFriend.username}</div>
                                            <span
                                                className={`bullet ${currentChatFriend.isOnline ? "active" : "inactive"}`}></span>
                                        </div>
                                        <div className="circle !bg-transparent hover:!bg-dark-50 cursor-pointer">
                                            <HiEllipsisVertical/>
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="message-list">
                                <div className="">
                                    {messages && messages[room]?.map((msg) => (
                                        <div
                                            className={`message-item  ${isYour(msg) ? "message-item-own" : "message-item-friend"}`}>
                                            <div
                                                className="circle !w-8 !h-8 !text-xs">{getFirstLetter(currentChatFriend.username)}</div>
                                            <p className="whitespace-pre-line">{msg.text}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                            <div className="message-fixed-input">
                                <div className="container">
                                    <form onSubmit={handleSendMessage} className="w-full flex gap-x-2 items-center">
                                        <textarea className="input" name="message"></textarea>
                                        <button type="submit" className="btn flex items-center gap-x-1">Send <BiSend/>
                                        </button>
                                    </form>
                                </div>
                            </div>
                        </div>

                    ) : (
                        <div className="bg-red-400 ">
                            <p className="text-xl text-center">Please Choose a Friend name to chatting</p>
                        </div>
                    )}

                </div>
            </div>
        </div>
    );
};

export default Messenger;