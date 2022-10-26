import { useCallback, useEffect, useState } from "react"
import Quill from "quill"
import BlotFormatter from 'quill-blot-formatter';
// import QuillBetterTable from 'quill-better-table'
import "quill/dist/quill.snow.css"
import katex from "katex"
import "katex/dist/katex.min.css"
import { io } from "socket.io-client"
import { useParams } from "react-router-dom"

window.katex = katex;

const SAVE_INTERVAL_MS = 2000
const TOOLBAR_OPTIONS = [
  [{ header: [1, 2, 3, 4, 5, 6, false] }],
  [{ font: [] }],
  [{ list: "ordered" }, { list: "bullet" }],
  ["bold", "italic", "underline"],
  [{ color: [] }, { background: [] }],
  [{ script: "sub" }, { script: "super" }],
  [{ align: [] }],
  ["image", "video", "blockquote", "code-block"],
  ["formula"],
]

//Quill.register('modules/imageResize', ImageResize);

// Quill.register({
//   'modules/better-table': QuillBetterTable
// }, true)

export default function TextEditor() {
  const { id: documentId } = useParams()
  const [socket, setSocket] = useState()
  const [quill, setQuill] = useState()

  Quill.register('modules/blotFormatter', BlotFormatter);

  useEffect(() => {
    const s = io.connect("http://localhost:3001")
    setSocket(s)

    return () => {
      s.disconnect()
    }
  }, [])

  useEffect(() => {
    if (socket == null || quill == null) return

    socket.once("load-document", document => {
      quill.setContents(document)
      quill.enable()
    })

    socket.emit("get-document", documentId)
  }, [socket, quill, documentId])

  useEffect(() => {
    if (socket == null || quill == null) return

    const interval = setInterval(() => {
      socket.emit("save-document", quill.getContents())
    }, SAVE_INTERVAL_MS)

    return () => {
      clearInterval(interval)
    }
  }, [socket, quill])

  useEffect(() => {
    if (socket == null || quill == null) return

    const handler = delta => {
      quill.updateContents(delta)
    }
    socket.on("receive-changes", handler)

    return () => {
      socket.off("receive-changes", handler)
    }
  }, [socket, quill])

  useEffect(() => {
    if (socket == null || quill == null) return

    const handler = (delta, oldDelta, source) => {
      if (source !== "user") return
      socket.emit("send-changes", delta)
    }
    quill.on("text-change", handler)

    return () => {
      quill.off("text-change", handler)
    }
  }, [socket, quill])

  const wrapperRef = useCallback(wrapper => {
    if (wrapper == null) return

    wrapper.innerHTML = ""
    const editor = document.createElement("div")
    wrapper.append(editor)
    const q = new Quill(editor, {
      theme: "snow",
      modules: {
        toolbar: TOOLBAR_OPTIONS,
        blotFormatter: {}
        // table: false,
        // 'better-table': {
        //   operationMenu: {
        //     items: {
        //       unmergeCells: {
        //         text: 'Another unmerge cells name'
        //       }
        //     },
        //   }
        // },
      },
      // keyboard: {
      //   bindings: QuillBetterTable.keyboardBindings
      // }
    })
    q.disable()
    q.setText("Loading...")
    setQuill(q)
  }, [])
  return <div className="container" ref={wrapperRef}></div>
}
