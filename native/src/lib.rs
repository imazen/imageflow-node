// extern crate neon;
// extern crate imageflow_core;

// use neon::prelude::*;

// fn get_long_version_string(mut cx: FunctionContext) -> JsResult<JsString> {
//     Ok(cx.string(imageflow_types::version::one_line_version()))
// }

// // pub fn buf_copy_from_slice(data: &[u8], buf: &mut Handle<JsBuffer>) {
// //     buf.grab(|mut contents| { contents.as_mut_slice().copy_from_slice(data) });
// // }

// pub struct ContextWrapper{
//     inner: Box<imageflow_core::Context>
// }
// impl ContextWrapper{
//     fn new() -> ContextWrapper{
        // match imageflow_core::Context::create_can_panic(){
        //     Ok(v) => ContextWrapper{
        //         inner: v
        //     },
        //     Err(e) => panic!(e)
        // }
//     }
//     fn add_input_bytes_copied_panic(&mut self, io_id: i32, bytes: &[u8]){
//         match self.inner.add_copied_input_buffer(io_id, bytes){
//             Ok(_) => {},
//             Err(e) => panic!(e)
//         }
//     }
//     fn add_output_buffer_panic(&mut self, io_id: i32){
//         match self.inner.add_output_buffer(io_id){
//             Ok(_) => {},
//             Err(e) => panic!(e)
//         }
//     }

//     fn get_output_buffer_bytes_panic(&mut self, io_id: i32) -> &[u8]{
//         match self.inner.get_output_buffer_slice(io_id){
//             Ok(bytes) => bytes,
//             Err(e) => panic!(e)
//         }
//     }

//     fn message(&mut self, method: String, message: String) -> String{
//         let (response, _result) =  self.inner.message(&method, message.as_bytes());
//         match String::from_utf8(response.response_json.to_vec())
//         {
//             Ok(response) => response,
//             Err(e) => panic!(e),
//         }
//     }

//     fn test(&mut self){
//         //neon::borrow::RefMut::deref_mut()
//         //neon::context::CallContext::arr
//        // self.inner.add_input_bytes()
//         //BinaryData::write_all_at()

//     }
// }

// declare_types! {
//   pub class JsContext for ContextWrapper {
//     init(_cx) {
//         Ok(ContextWrapper::new())
//     }
//     method addInputBytesCopied(mut cx){
//         let mut this = cx.this();
//         let io_id: i32 = cx.argument::<JsNumber>(0)?.value() as i32;
//         let bytes: Handle<JsArrayBuffer> = cx.argument(1)?;
//         {
//             let guard = cx.lock();
//             let mut job = this.borrow_mut(&guard);
//             cx.borrow(&bytes, |data| {
//                 let slice = data.as_slice::<u8>();
//                 job.add_input_bytes_copied_panic(io_id, slice)
//             });
//         }
//         Ok(cx.undefined().upcast())
//     }
//     method addOutputBuffer(mut cx){
//         let mut this = cx.this();
//         let io_id: i32 = cx.argument::<JsNumber>(0)?.value() as i32;
//         {
//             let guard = cx.lock();
//             let mut job = this.borrow_mut(&guard);
//             job.add_output_buffer_panic(io_id)
//         }
//         Ok(cx.undefined().upcast())
//     }
//     // method getOutputBufferBytes(mut cx){
//     //     let mut this = cx.this();
//     //     let io_id: i32 = cx.argument::<JsNumber>(0)?.value() as i32;
//     //     let buffer = {
//     //         let guard = cx.lock();
//     //         let mut job = this.borrow_mut(&guard);
//     //         let bytes = job.get_output_buffer_bytes_panic(io_id);
//     //         let buffer = cx.array_buffer(bytes.len() as u32)?;
//     //         buf_copy_from_slice(bytes, buffer);
//     //         buffer
//     //     };
//     //
//     //     Ok(buffer.upcast())
//     // }

//     method message(mut cx){
//         let mut this = cx.this();
//         let method: String = cx.argument::<JsString>(0)?.value();
//         let message: String = cx.argument::<JsString>(1)?.value();
//         let response = {
//             let guard = cx.lock();
//             let mut job = this.borrow_mut(&guard);
//             job.message(method, message)
//         };
//         Ok(cx.string(response).upcast())
//     }

//     method panic(_) {
//       panic!("JobContext.prototype.panic")
//     }
//   }
// }

// register_module!(mut cx, {
//     cx.export_function("getLongVersionString", get_long_version_string)?;
//     cx.export_class::<JsContext>("JobContext")?;
//     Ok(())
// });

use nodejs_sys::{
    napi_callback_info, napi_create_external_arraybuffer, napi_create_string_utf8,
    napi_define_class, napi_env, napi_get_cb_info, napi_get_undefined, napi_get_value_int32,
    napi_property_attributes, napi_property_descriptor, napi_ref, napi_set_property, napi_unwrap,
    napi_value, napi_wrap,
};
use std::ffi::{c_void, CString};

pub unsafe extern "C" fn add_input_bytes_copied(
    _env: napi_env,
    _info: napi_callback_info,
) -> napi_value {
    unimplemented!()
}
pub unsafe extern "C" fn add_output_buffer_string(
    _env: napi_env,
    _info: napi_callback_info,
) -> napi_value {
    unimplemented!()
}

pub unsafe extern "C" fn get_output_buffer_bytes(
    env: napi_env,
    info: napi_callback_info,
) -> napi_value {
    let mut local: napi_value = std::mem::zeroed();
    //napi_get_undefined(env, &mut local);
    let mut js_this: napi_value = std::mem::zeroed();
    let mut s = 0;
    napi_get_cb_info(
        env,
        info,
        &mut s,
        std::ptr::null_mut(),
        &mut js_this,
        std::ptr::null_mut(),
    );
    let mut val = std::mem::zeroed();
    napi_unwrap(env, js_this, &mut val);
    let task: Box<Context> = Box::from_raw(std::mem::transmute(val));
    let mut read = 0 as i32;
    let mut args_buffer: [napi_value; 1] = std::mem::zeroed();
    let args_ptr = args_buffer.as_mut_ptr();
    let mut s = 1;
    napi_get_cb_info(
        env,
        info,
        &mut s,
        args_ptr,
        std::ptr::null_mut(),
        std::ptr::null_mut(),
    );
    napi_get_value_int32(env, args_buffer[0], &mut read);
    match &task.inner {
        Some(v) => {
            match v.get_output_buffer_slice(read) {
                Ok(v) => {
                    let s = napi_create_external_arraybuffer(
                        env,
                        v.as_ptr() as *mut c_void,
                        v.len(),
                        None,
                        std::ptr::null_mut(),
                        &mut local,
                    );
                    println!("{:?}", s);
                }
                Err(err) => {
                    println!("{}", err);
                }
            };
        }
        None => (),
    };
    Box::into_raw(task);
    local
}

pub unsafe extern "C" fn message(_env: napi_env, _info: napi_callback_info) -> napi_value {
    unimplemented!()
}

pub unsafe extern "C" fn clean(env: napi_env, info: napi_callback_info) -> napi_value {
    let mut local: napi_value = std::mem::zeroed();
    napi_get_undefined(env, &mut local);
    let mut js_this: napi_value = std::mem::zeroed();
    let mut s = 0;
    napi_get_cb_info(
        env,
        info,
        &mut s,
        std::ptr::null_mut(),
        &mut js_this,
        std::ptr::null_mut(),
    );
    let mut val = std::mem::zeroed();
    napi_unwrap(env, js_this, &mut val);
    let mut task: Box<Context> = Box::from_raw(std::mem::transmute(val));
    task.inner = None;
    Box::into_raw(task);
    local
}

pub unsafe extern "C" fn create_class(env: napi_env, info: napi_callback_info) -> napi_value {
    let mut local: napi_value = std::mem::zeroed();
    let mut s = 0;
    napi_get_cb_info(
        env,
        info,
        &mut s,
        std::ptr::null_mut(),
        &mut local,
        std::ptr::null_mut(),
    );
    let v=match imageflow_core::Context::create_can_panic(){
        Ok(v) =>  v,
        Err(e) => panic!(e)
    };
    let inner = Context { inner: Some(v) };
    let re = Box::into_raw(Box::new(inner));
    let mut new_local: napi_ref = std::mem::zeroed();
    napi_wrap(
        env,
        local,
        re as *mut c_void,
        Some(drop_native),
        std::ptr::null_mut(),
        &mut new_local,
    );
    local
}

pub unsafe extern "C" fn drop_native(
    _env: napi_env,
    finalize_data: *mut c_void,
    _finalize_hint: *mut c_void,
) {
    Box::from_raw(finalize_data);
}

use imageflow_core;

pub struct Context {
    pub inner: Option<Box<imageflow_core::Context>>,
}

#[no_mangle]
pub unsafe extern "C" fn napi_register_module_v1(
    env: napi_env,
    m: napi_value,
) -> nodejs_sys::napi_value {
    let key_str = CString::new("Job").expect("CString::new failed");
    let mut key = std::mem::zeroed();
    napi_create_string_utf8(env, key_str.as_ptr(), 3, &mut key);
    let mut local: napi_value = std::mem::zeroed();
    let add_input_bytes_copied_string =
        CString::new("addInputBytesCopied").expect("CString::new failed");
    let add_output_buffer_string = CString::new("addOutputBuffer").expect("CString::new failed");
    let get_output_buffer_bytes_string =
        CString::new("getOutputBufferBytes").expect("CString::new failed");
    let message_string = CString::new("message").expect("CString::new failed");

    let mut properties = [
        napi_property_descriptor {
            utf8name: add_input_bytes_copied_string.as_ptr(),
            name: std::ptr::null_mut(),
            method: Some(add_input_bytes_copied),
            getter: None,
            setter: None,
            value: std::ptr::null_mut(),
            attributes: napi_property_attributes::napi_default,
            data: std::ptr::null_mut(),
        },
        napi_property_descriptor {
            utf8name: add_output_buffer_string.as_ptr(),
            name: std::ptr::null_mut(),
            method: Some(add_input_bytes_copied),
            getter: None,
            setter: None,
            value: std::ptr::null_mut(),
            attributes: napi_property_attributes::napi_default,
            data: std::ptr::null_mut(),
        },
        napi_property_descriptor {
            utf8name: get_output_buffer_bytes_string.as_ptr(),
            name: std::ptr::null_mut(),
            method: Some(get_output_buffer_bytes),
            getter: None,
            setter: None,
            value: std::ptr::null_mut(),
            attributes: napi_property_attributes::napi_default,
            data: std::ptr::null_mut(),
        },
        napi_property_descriptor {
            utf8name: message_string.as_ptr(),
            name: std::ptr::null_mut(),
            method: Some(message),
            getter: None,
            setter: None,
            value: std::ptr::null_mut(),
            attributes: napi_property_attributes::napi_default,
            data: std::ptr::null_mut(),
        },
    ];
    let properties_prt = properties.as_mut_ptr();
    napi_define_class(
        env,
        key_str.as_ptr(),
        3,
        Some(create_class),
        std::ptr::null_mut(),
        5,
        properties_prt,
        &mut local,
    );
    napi_set_property(env, m, key, local);
    m
}
