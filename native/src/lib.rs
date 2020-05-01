use nodejs_sys::{
    napi_adjust_external_memory, napi_call_threadsafe_function, napi_callback_info,
    napi_create_external_arraybuffer, napi_create_function, napi_create_promise,
    napi_create_string_utf8, napi_create_threadsafe_function, napi_deferred, napi_define_class,
    napi_env, napi_get_arraybuffer_info, napi_get_cb_info, napi_get_undefined,
    napi_get_value_int32, napi_get_value_string_utf8, napi_property_attributes,
    napi_property_descriptor, napi_reject_deferred, napi_release_threadsafe_function,
    napi_resolve_deferred, napi_set_property, napi_status, napi_threadsafe_function,
    napi_threadsafe_function_call_mode, napi_threadsafe_function_release_mode, napi_unwrap,
    napi_value, napi_wrap,
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
    std::mem::forget(task);
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
    // println!("{:?}", task);
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
                        data.len(),
                        Some(handle_buffer_drop),
                        Box::into_raw(Box::new(data.len())) as *mut c_void,
                        &mut local,
                    );
                    napi_adjust_external_memory(env, data.len() as i64, std::ptr::null_mut());
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
pub unsafe extern "C" fn message_sync(env: napi_env, info: napi_callback_info) -> napi_value {
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
    let method = get_string(env, args_buffer[0]);
    let message = get_string(env, args_buffer[1]);
    let mut inner = task.inner.expect("Context");
    let (response, _result) = inner.message(&method, message.as_bytes());
    let re = match std::str::from_utf8(&response.response_json.to_vec()) {
        Ok(string_response) => string_response.to_owned(),
        Err(err) => err.to_string(),
    };
    let mut s: napi_value = std::mem::zeroed();
    create_string(env, &re, &mut s);
    task.inner = Some(inner);
    std::mem::forget(task);
    s
}

struct ThreadSafeFunction(napi_threadsafe_function);
unsafe impl Send for Context {}
unsafe impl Send for ThreadSafeFunction {}

pub unsafe extern "C" fn task_compelete(
    env: napi_env,
    _js_cb: napi_value,
    ctx: *mut c_void,
    data: *mut c_void,
) {
    let value: Box<Result<String, String>> =
        Box::from_raw(std::mem::transmute(Box::from_raw(data)));
    match value.as_ref() {
        Ok(s) => {
            let mut result: napi_value = std::mem::zeroed();
            create_string(env, &s, &mut result);
            napi_resolve_deferred(env, ctx as napi_deferred, result);
        }
        Err(e) => {
            let mut result: napi_value = std::mem::zeroed();
            create_string(env, &e, &mut result);
            napi_reject_deferred(env, ctx as napi_deferred, result);
        }
    };
}

pub unsafe extern "C" fn message(env: napi_env, info: napi_callback_info) -> napi_value {
    let mut js_this: napi_value = std::mem::zeroed();
    let mut s = 2;
    let mut args_buffer: [napi_value; 2] = std::mem::zeroed();
    let args_ptr = args_buffer.as_mut_ptr();
    let mut promise: napi_value = std::mem::zeroed();
    let mut deferred: napi_deferred = std::mem::zeroed();
    let mut work_name: napi_value = std::mem::zeroed();
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
    let method = get_string(env, args_buffer[0]);
    let message = get_string(env, args_buffer[1]);
    let mut task: Box<Context> = Box::from_raw(std::mem::transmute(val));
    let mut tsfn: napi_threadsafe_function = std::ptr::null_mut();
    napi_create_threadsafe_function(
        env,
        std::ptr::null_mut(),
        std::ptr::null_mut(),
        work_name,
        0,
        1,
        std::ptr::null_mut(),
        None,
        deferred as *mut c_void,
        Some(task_compelete),
        &mut tsfn,
    );
    let thread_safe = ThreadSafeFunction(tsfn);
    std::thread::spawn(move || {
        let mut inner = task.inner.expect("error");
        let (response, _result) = inner.message(&method, message.as_bytes());
        let v = response.response_json.to_vec();
        let value = match std::str::from_utf8(&v) {
            Ok(v) => Ok(v.to_string()),
            Err(e) => Err(e.to_string()),
        };
        napi_call_threadsafe_function(
            thread_safe.0,
            Box::into_raw(Box::new(value)) as *mut c_void,
            napi_threadsafe_function_call_mode::napi_tsfn_blocking,
        );
        napi_release_threadsafe_function(
            thread_safe.0,
            napi_threadsafe_function_release_mode::napi_tsfn_release,
        );
        task.inner = Some(inner);
        std::mem::forget(task);
    });
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
    napi_wrap(
        env,
        local,
        re as *mut c_void,
        Some(drop_native),
        std::ptr::null_mut(),
        std::ptr::null_mut(),
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
    let message_sync_string = CString::new("messageSync").expect("CString::new failed");
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
        napi_property_descriptor {
            utf8name: message_sync_string.as_ptr(),
            name: std::ptr::null_mut(),
            method: Some(message_sync),
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
        6,
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
