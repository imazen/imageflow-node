use nodejs_sys::{
    napi_adjust_external_memory, napi_async_work, napi_callback_info, napi_create_async_work,
    napi_create_error, napi_create_external_arraybuffer, napi_create_function, napi_create_promise,
    napi_create_string_utf8, napi_deferred, napi_define_class, napi_delete_async_work, napi_env,
    napi_get_arraybuffer_info, napi_get_cb_info, napi_get_undefined, napi_get_value_int32,
    napi_get_value_string_utf8, napi_property_attributes, napi_property_descriptor,
    napi_queue_async_work, napi_ref, napi_reject_deferred, napi_resolve_deferred,
    napi_set_property, napi_status, napi_unwrap, napi_value, napi_wrap,
};
use std::ffi::{c_void, CString};

pub unsafe fn get_string(env: napi_env, val: napi_value) -> String {
    let mut len = std::mem::MaybeUninit::uninit();
    napi_get_value_string_utf8(env, val, std::ptr::null_mut(), 0, len.as_mut_ptr());
    let size = len.assume_init() as usize;
    let mut ve: Vec<u8> = Vec::with_capacity(size + 1);
    let raw = ve.as_mut_ptr();
    std::mem::forget(ve);
    let mut cap = std::mem::MaybeUninit::uninit();
    let _s = napi_get_value_string_utf8(env, val, raw as *mut i8, size + 1, cap.as_mut_ptr());
    String::from_raw_parts(raw, cap.assume_init(), size)
}

pub fn create_string(env: napi_env, s: &str, local: &mut napi_value) -> napi_status {
    let p = CString::new(s).expect("CString::new failed");
    unsafe {
        let status = napi_create_string_utf8(env, p.as_ptr(), s.len(), local);
        return status;
    }
}

pub unsafe extern "C" fn get_long_version_string(
    env: napi_env,
    _info: napi_callback_info,
) -> napi_value {
    let s = imageflow_types::version::one_line_version();
    let mut local: napi_value = std::mem::zeroed();
    create_string(env, &s, &mut local);
    local
}

// add_input_bytes
pub unsafe extern "C" fn add_input_bytes(env: napi_env, info: napi_callback_info) -> napi_value {
    let mut local: napi_value = std::mem::zeroed();
    napi_get_undefined(env, &mut local);
    let mut js_this: napi_value = std::mem::zeroed();
    let mut s = 2;
    let mut args_buffer: [napi_value; 2] = std::mem::zeroed();
    let args_ptr = args_buffer.as_mut_ptr();
    napi_get_cb_info(
        env,
        info,
        &mut s,
        args_ptr,
        &mut js_this,
        std::ptr::null_mut(),
    );
    let mut val = std::mem::zeroed();
    napi_unwrap(env, js_this, &mut val);
    let mut task: Box<Context> = Box::from_raw(std::mem::transmute(val));
    let mut read = 0 as i32;
    napi_get_value_int32(env, args_buffer[0], &mut read);
    let mut array_buffer = std::ptr::null_mut();
    let mut len = 0;
    napi_get_arraybuffer_info(env, args_buffer[1], &mut array_buffer, &mut len);
    let vec_data = Vec::from_raw_parts(array_buffer as *mut u8, len, len);
    match &mut task.inner {
        Some(v) => {
            match v.add_copied_input_buffer(read, vec_data.as_slice()) {
                Ok(_) => (),
                Err(err) => {
                    println!("{}", err);
                }
            };
        }
        None => (),
    };
    std::mem::forget(vec_data);
    Box::into_raw(task);
    local
}
pub unsafe extern "C" fn add_output_buffer(env: napi_env, info: napi_callback_info) -> napi_value {
    let mut local: napi_value = std::mem::zeroed();
    napi_get_undefined(env, &mut local);
    let mut js_this: napi_value = std::mem::zeroed();
    let mut s = 1;
    let mut args_buffer: [napi_value; 1] = std::mem::zeroed();
    let args_ptr = args_buffer.as_mut_ptr();
    napi_get_cb_info(
        env,
        info,
        &mut s,
        args_ptr,
        &mut js_this,
        std::ptr::null_mut(),
    );
    let mut val = std::mem::zeroed();
    napi_unwrap(env, js_this, &mut val);
    let mut task: Box<Context> = Box::from_raw(std::mem::transmute(val));
    let mut read = 0 as i32;
    napi_get_value_int32(env, args_buffer[0], &mut read);
    match &mut task.inner {
        Some(v) => {
            match v.add_output_buffer(read) {
                Ok(_) => (),
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

pub unsafe extern "C" fn get_output_buffer_bytes(
    env: napi_env,
    info: napi_callback_info,
) -> napi_value {
    let mut local: napi_value = std::mem::zeroed();
    let mut js_this: napi_value = std::mem::zeroed();
    let mut s = 1;
    let mut args_buffer: [napi_value; 1] = std::mem::zeroed();
    let args_ptr = args_buffer.as_mut_ptr();
    napi_get_cb_info(
        env,
        info,
        &mut s,
        args_ptr,
        &mut js_this,
        std::ptr::null_mut(),
    );
    let mut val = std::mem::zeroed();
    napi_unwrap(env, js_this, &mut val);
    let task: Box<Context> = Box::from_raw(std::mem::transmute(val));
    let mut read = 0 as i32;
    napi_get_value_int32(env, args_buffer[0], &mut read);
    match &task.inner {
        Some(v) => {
            match v.get_output_buffer_slice(read) {
                Ok(v) => {
                    let data = v.to_vec();
                    napi_create_external_arraybuffer(
                        env,
                        data.as_ptr() as *mut c_void,
                        v.len(),
                        Some(handle_buffer_drop),
                        Box::into_raw(Box::new(v.len())) as *mut c_void,
                        &mut local,
                    );
                    napi_adjust_external_memory(env, v.len() as i64, std::ptr::null_mut());
                    std::mem::forget(data);
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

struct MessageTask {
    message: String,
    method: String,
    result: Option<Result<String, String>>,
    context: Box<Context>,
    work: napi_async_work,
    deferred: napi_deferred,
}

pub unsafe extern "C" fn perform_task(_env: napi_env, data: *mut c_void) {
    let mut task: Box<MessageTask> = Box::from_raw(std::mem::transmute(data));
    match &mut task.context.inner {
        Some(v) => {
            let (response, _result) = v.message(&task.method, task.message.as_bytes());
            match std::str::from_utf8(&response.response_json.to_vec()) {
                Ok(string_response) => {
                    task.result = Some(Ok(string_response.to_owned()));
                }
                Err(err) => task.result = Some(Err(err.to_string())),
            };
        }
        None => {
            task.result = Some(Err("Context not found".to_owned()));
        }
    };
    Box::into_raw(task);
}

pub unsafe extern "C" fn complete_task(env: napi_env, _status: napi_status, data: *mut c_void) {
    let task: Box<MessageTask> = Box::from_raw(std::mem::transmute(data));
    let v = match task.result {
        Some(d) => match d {
            Ok(result) => result,
            Err(err) => {
                let mut js_error: napi_value = std::mem::zeroed();
                let mut error_code: napi_value = std::mem::zeroed();
                let mut error_string = std::mem::zeroed();
                create_string(env, "100", &mut error_code);
                create_string(env, &err, &mut error_string);
                napi_create_error(env, error_code, error_string, &mut js_error);
                napi_reject_deferred(env, task.deferred, js_error);
                napi_delete_async_work(env, task.work);
                return;
            }
        },
        None => {
            let mut js_error: napi_value = std::mem::zeroed();
            let mut error_code: napi_value = std::mem::zeroed();
            let mut error_string = std::mem::zeroed();
            create_string(env, "100", &mut error_code);
            create_string(env, "Error while performing task", &mut error_string);
            napi_create_error(env, error_code, error_string, &mut js_error);
            napi_reject_deferred(env, task.deferred, js_error);
            napi_delete_async_work(env, task.work);
            return;
        }
    };
    let mut response: napi_value = std::mem::zeroed();
    Box::into_raw(task.context);
    create_string(env, &v, &mut response);
    napi_resolve_deferred(env, task.deferred, response);
    napi_delete_async_work(env, task.work);
}

pub unsafe extern "C" fn message(env: napi_env, info: napi_callback_info) -> napi_value {
    let mut js_this: napi_value = std::mem::zeroed();
    let mut s = 2;
    let mut args_buffer: [napi_value; 2] = std::mem::zeroed();
    let args_ptr = args_buffer.as_mut_ptr();
    let mut promise: napi_value = std::mem::zeroed();
    let mut deferred: napi_deferred = std::mem::zeroed();
    let mut work_name: napi_value = std::mem::zeroed();
    let mut work: napi_async_work = std::mem::zeroed();
    create_string(env, "Message Function", &mut work_name);
    napi_create_promise(env, &mut deferred, &mut promise);
    napi_get_cb_info(
        env,
        info,
        &mut s,
        args_ptr,
        &mut js_this,
        std::ptr::null_mut(),
    );
    let mut val = std::mem::zeroed();
    napi_unwrap(env, js_this, &mut val);
    let task: Box<Context> = Box::from_raw(std::mem::transmute(val));
    let method = get_string(env, args_buffer[0]);
    let message = get_string(env, args_buffer[1]);
    let message_task = MessageTask {
        message,
        method,
        context: task,
        result: None,
        work,
        deferred,
    };
    let raw = Box::into_raw(Box::new(message_task));
    napi_create_async_work(
        env,
        std::ptr::null_mut(),
        work_name,
        Some(perform_task),
        Some(complete_task),
        std::mem::transmute(raw),
        &mut work,
    );
    napi_queue_async_work(env, work);
    (*raw).work = work;
    promise
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
    let v = match imageflow_core::Context::create_can_panic() {
        Ok(v) => v,
        Err(e) => panic!(e),
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

pub unsafe extern "C" fn handle_buffer_drop(
    env: napi_env,
    finalize_data: *mut c_void,
    finalize_hint: *mut c_void,
) {
    let len: Box<i64> = Box::from_raw(finalize_hint as *mut i64);
    let _ = Vec::from_raw_parts(
        finalize_data as *mut u8,
        *len.as_ref() as usize,
        *len.as_ref() as usize,
    );
    let len = *len.as_ref();
    napi_adjust_external_memory(env, -1 * len, std::ptr::null_mut());
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

    let clean_string = CString::new("clean").expect("CString::new failed");
    let mut properties = [
        napi_property_descriptor {
            utf8name: add_input_bytes_copied_string.as_ptr(),
            name: std::ptr::null_mut(),
            method: Some(add_input_bytes),
            getter: None,
            setter: None,
            value: std::ptr::null_mut(),
            attributes: napi_property_attributes::napi_default,
            data: std::ptr::null_mut(),
        },
        napi_property_descriptor {
            utf8name: add_output_buffer_string.as_ptr(),
            name: std::ptr::null_mut(),
            method: Some(add_output_buffer),
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
        napi_property_descriptor {
            utf8name: clean_string.as_ptr(),
            name: std::ptr::null_mut(),
            method: Some(clean),
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
    let mut get_long_version: napi_value = std::mem::zeroed();
    let get_long_version_name = CString::new("getLongVersionString").expect("CString::new failed");
    napi_create_function(
        env,
        get_long_version_name.as_ptr(),
        21,
        Some(get_long_version_string),
        std::ptr::null_mut(),
        &mut get_long_version,
    );
    let mut get_long_version_key: napi_value = std::mem::zeroed();
    create_string(env, "getLongVersionString", &mut get_long_version_key);
    napi_set_property(env, m, key, local);
    napi_set_property(env, m, get_long_version_key, get_long_version);
    m
}
