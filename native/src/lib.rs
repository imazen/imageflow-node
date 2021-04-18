use nodejs_sys::{
    napi_adjust_external_memory, napi_call_threadsafe_function, napi_callback_info,
    napi_create_error, napi_create_external_arraybuffer, napi_create_function, napi_create_promise,
    napi_create_string_utf8, napi_create_threadsafe_function, napi_deferred, napi_define_class,
    napi_env, napi_get_arraybuffer_info, napi_get_cb_info, napi_get_undefined,
    napi_get_value_int32, napi_get_value_string_utf8, napi_property_attributes,
    napi_property_descriptor, napi_reject_deferred, napi_release_threadsafe_function,
    napi_resolve_deferred, napi_set_property, napi_status, napi_threadsafe_function,
    napi_threadsafe_function_call_mode, napi_threadsafe_function_release_mode, napi_unwrap,
    napi_value, napi_wrap,
};

use std::ffi::{c_void, CString};
use std::panic::{catch_unwind, AssertUnwindSafe};
use std::sync::Mutex;
use threadpool::ThreadPool;

static mut POOL: Option<Mutex<ThreadPool>> = None;

macro_rules! handle_error {
    ($env:expr,$result:expr) => {
        match $result {
            Ok(value) => value,
            Err(panic) => {
                let msg = if let Some(string) = panic.downcast_ref::<String>() {
                    format!("internal error in module: {}", string)
                } else if let Some(str) = panic.downcast_ref::<&str>() {
                    format!("internal error in module: {}", str)
                } else {
                    "internal error in  module".to_string()
                };
                let js_error = create_error($env, "INTERNAL_ERROR", &msg);
                assert_eq!(
                    nodejs_sys::napi_throw($env, js_error),
                    nodejs_sys::napi_status::napi_ok
                );
                let mut undefined: napi_value = std::mem::zeroed();
                assert_eq!(
                    nodejs_sys::napi_get_undefined($env, &mut undefined),
                    nodejs_sys::napi_status::napi_ok
                );
                undefined
            }
        }
    };
}

macro_rules! context {
    ($ptr:ident) => {{
        if $ptr.is_null() {
            eprintln!("Null context pointer provided. Terminating process.",);
            ::std::process::abort();
        }
        ({ &mut *$ptr })
    }};
}

macro_rules! handle_context_error {
    ($env:expr,$context:expr,$error:expr) => {{
        let msg = format!("internal error in module: {}", $error);
        $context.outward_error_mut().try_set_error($error);
        let mut undefined: napi_value = std::mem::zeroed();
        let js_error = create_error($env, "INTERNAL_ERROR", &msg);
        assert_eq!(
            nodejs_sys::napi_throw($env, js_error),
            nodejs_sys::napi_status::napi_ok
        );
        assert_eq!(
            nodejs_sys::napi_get_undefined($env, &mut undefined),
            nodejs_sys::napi_status::napi_ok
        );
        return undefined;
    }};
}

macro_rules! check_context {
    ($env:expr,$context:expr) => {
        let e = $context.outward_error();
        if (e.has_error()) {
            let mut undefined: napi_value = std::mem::zeroed();
            let js_error = create_error($env, "INTERNAL_ERROR", "context already has a error");
            assert_eq!(
                nodejs_sys::napi_throw($env, js_error),
                nodejs_sys::napi_status::napi_ok
            );
            assert_eq!(
                nodejs_sys::napi_get_undefined($env, &mut undefined),
                nodejs_sys::napi_status::napi_ok
            );
            return undefined;
        }
    };
}

macro_rules! handle_context_panic {
    ($env:expr,$context:expr,$error:expr) => {{
        let msg = if let Some(string) = $error.downcast_ref::<String>() {
            format!("internal error in module: {}", string)
        } else if let Some(str) = $error.downcast_ref::<&str>() {
            format!("internal error in module: {}", str)
        } else {
            "internal error in  module".to_string()
        };
        $context.outward_error_mut().try_set_panic_error($error);
        let mut undefined: napi_value = std::mem::zeroed();
        let js_error = create_error($env, "INTERNAL_ERROR", &msg);
        assert_eq!(
            nodejs_sys::napi_throw($env, js_error),
            nodejs_sys::napi_status::napi_ok
        );
        assert_eq!(
            nodejs_sys::napi_get_undefined($env, &mut undefined),
            nodejs_sys::napi_status::napi_ok
        );
        return undefined;
    }};
}

pub unsafe fn create_error(env: napi_env, code: &str, error: &str) -> napi_value {
    let mut js_code: napi_value = std::mem::zeroed();
    let mut js_error_string: napi_value = std::mem::zeroed();
    assert_eq!(create_string(env, code, &mut js_code), napi_status::napi_ok);
    assert_eq!(
        create_string(env, error, &mut js_error_string),
        napi_status::napi_ok
    );
    let mut js_error: napi_value = std::mem::zeroed();
    assert_eq!(
        napi_create_error(env, js_code, js_error_string, &mut js_error),
        napi_status::napi_ok
    );
    js_error
}

pub unsafe fn get_string(env: napi_env, val: napi_value) -> String {
    let mut len = std::mem::MaybeUninit::uninit();
    assert_eq!(
        napi_get_value_string_utf8(env, val, std::ptr::null_mut(), 0, len.as_mut_ptr()),
        napi_status::napi_ok
    );
    let size = len.assume_init() as usize;
    let mut ve: Vec<u8> = Vec::with_capacity(size + 1);
    let raw = ve.as_mut_ptr();
    std::mem::forget(ve);
    let mut cap = std::mem::MaybeUninit::uninit();
    let _s = assert_eq!(
        napi_get_value_string_utf8(env, val, raw as *mut i8, size + 1, cap.as_mut_ptr()),
        napi_status::napi_ok
    );
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
    let result = catch_unwind(|| {
        let s = imageflow_types::version::one_line_version();
        let mut local: napi_value = std::mem::zeroed();
        assert_eq!(create_string(env, &s, &mut local), napi_status::napi_ok);
        local
    });
    handle_error!(env, result)
}

// add_input_bytes
pub unsafe extern "C" fn add_input_bytes(env: napi_env, info: napi_callback_info) -> napi_value {
    let result = catch_unwind(|| {
        let mut local: napi_value = std::mem::zeroed();
        assert_eq!(napi_get_undefined(env, &mut local), napi_status::napi_ok);
        let mut js_this: napi_value = std::mem::zeroed();
        let mut s = 2;
        let mut args_buffer: [napi_value; 2] = std::mem::zeroed();
        let args_ptr = args_buffer.as_mut_ptr();
        assert_eq!(
            napi_get_cb_info(
                env,
                info,
                &mut s,
                args_ptr,
                &mut js_this,
                std::ptr::null_mut(),
            ),
            napi_status::napi_ok
        );
        let mut val = std::mem::zeroed();
        assert_eq!(napi_unwrap(env, js_this, &mut val), napi_status::napi_ok);
        let task = val as *mut Context;
        let mut read = 0 as i32;
        assert_eq!(
            napi_get_value_int32(env, args_buffer[0], &mut read),
            napi_status::napi_ok
        );
        let mut array_buffer = std::ptr::null_mut();
        let mut len = 0;
        assert_eq!(
            napi_get_arraybuffer_info(env, args_buffer[1], &mut array_buffer, &mut len),
            napi_status::napi_ok
        );
        let vec_data = Vec::from_raw_parts(array_buffer as *mut u8, len, len);
        let mut inner = context!(task).inner.lock().unwrap();
        check_context!(env, inner);
        match catch_unwind(AssertUnwindSafe(|| {
            let result = inner.add_copied_input_buffer(read, vec_data.as_slice());
            std::mem::forget(vec_data);
            result
        })) {
            Ok(Ok(_)) => {}
            Ok(Err(err)) => {
                handle_context_error!(env, inner, err);
            }
            Err(panic) => {
                handle_context_panic!(env, inner, panic);
            }
        };
        local
    });
    handle_error!(env, result)
}

pub unsafe extern "C" fn add_output_buffer(env: napi_env, info: napi_callback_info) -> napi_value {
    let result = catch_unwind(|| {
        let mut local: napi_value = std::mem::zeroed();
        assert_eq!(napi_get_undefined(env, &mut local), napi_status::napi_ok);
        let mut js_this: napi_value = std::mem::zeroed();
        let mut s = 1;
        let mut args_buffer: [napi_value; 1] = std::mem::zeroed();
        let args_ptr = args_buffer.as_mut_ptr();
        assert_eq!(
            napi_get_cb_info(
                env,
                info,
                &mut s,
                args_ptr,
                &mut js_this,
                std::ptr::null_mut(),
            ),
            napi_status::napi_ok
        );
        let mut val = std::mem::zeroed();
        assert_eq!(napi_unwrap(env, js_this, &mut val), napi_status::napi_ok);
        let task = val as *mut Context;
        let mut read = 0 as i32;
        assert_eq!(
            napi_get_value_int32(env, args_buffer[0], &mut read),
            napi_status::napi_ok
        );
        let mut inner = context!(task).inner.lock().unwrap();
        check_context!(env, inner);
        match catch_unwind(AssertUnwindSafe(|| inner.add_output_buffer(read))) {
            Ok(Ok(_)) => (),
            Ok(Err(err)) => {
                handle_context_error!(env, inner, err);
            }
            Err(panic) => {
                handle_context_panic!(env, inner, panic);
            }
        };
        local
    });
    handle_error!(env, result)
}

pub unsafe extern "C" fn get_output_buffer_bytes(
    env: napi_env,
    info: napi_callback_info,
) -> napi_value {
    let result = catch_unwind(|| {
        let mut local: napi_value = std::mem::zeroed();
        let mut js_this: napi_value = std::mem::zeroed();
        let mut s = 1;
        let mut args_buffer: [napi_value; 1] = std::mem::zeroed();
        let args_ptr = args_buffer.as_mut_ptr();
        assert_eq!(
            napi_get_cb_info(
                env,
                info,
                &mut s,
                args_ptr,
                &mut js_this,
                std::ptr::null_mut(),
            ),
            napi_status::napi_ok
        );
        let mut val = std::mem::zeroed();
        assert_eq!(napi_unwrap(env, js_this, &mut val), napi_status::napi_ok);
        let task = val as *mut Context;
        let mut read = 0 as i32;
        assert_eq!(
            napi_get_value_int32(env, args_buffer[0], &mut read),
            napi_status::napi_ok
        );
        let mut inner = context!(task).inner.lock().unwrap();
        check_context!(env, inner);
        match catch_unwind(AssertUnwindSafe(|| inner.get_output_buffer_slice(read))) {
            Ok(Ok(vect)) => {
                let data = vect.to_vec();
                assert_eq!(
                    napi_create_external_arraybuffer(
                        env,
                        data.as_ptr() as *mut c_void,
                        data.len(),
                        Some(handle_buffer_drop),
                        Box::into_raw(Box::new(data.len())) as *mut c_void,
                        &mut local,
                    ),
                    napi_status::napi_ok
                );
                let mut changed: i64 = 0;
                assert_eq!(
                    napi_adjust_external_memory(env, data.len() as i64, &mut changed),
                    napi_status::napi_ok
                );
                std::mem::forget(data);
            }
            Ok(Err(err)) => {
                handle_context_error!(env, inner, err);
            }
            Err(panic) => {
                handle_context_panic!(env, inner, panic);
            }
        };
        local
    });
    handle_error!(env, result)
}
pub unsafe extern "C" fn message_sync(env: napi_env, info: napi_callback_info) -> napi_value {
    let result = catch_unwind(|| {
        let mut js_this: napi_value = std::mem::zeroed();
        let mut s = 2;
        let mut args_buffer: [napi_value; 2] = std::mem::zeroed();
        let args_ptr = args_buffer.as_mut_ptr();
        assert_eq!(
            napi_get_cb_info(
                env,
                info,
                &mut s,
                args_ptr,
                &mut js_this,
                std::ptr::null_mut(),
            ),
            napi_status::napi_ok
        );
        let mut val = std::mem::zeroed();
        assert_eq!(napi_unwrap(env, js_this, &mut val), napi_status::napi_ok);
        let task = val as *mut Context;
        let method = get_string(env, args_buffer[0]);
        let message = get_string(env, args_buffer[1]);
        let mut inner = context!(task).inner.lock().unwrap();
        check_context!(env, inner);
        let (response, result) = match catch_unwind(AssertUnwindSafe(|| {
            inner.message(&method, message.as_bytes())
        })) {
            Ok(res) => res,
            Err(panic) => {
                handle_context_panic!(env, inner, panic);
            }
        };
        match result {
            Ok(_) => (),
            Err(err) => {
                handle_context_error!(env, inner, err);
            }
        }
        let re = match std::str::from_utf8(&response.response_json.to_vec()) {
            Ok(string_response) => string_response.to_owned(),
            Err(err) => err.to_string(),
        };
        let mut s: napi_value = std::mem::zeroed();
        assert_eq!(create_string(env, &re, &mut s), napi_status::napi_ok);
        s
    });
    handle_error!(env, result)
}

struct ThreadSafeFunction(napi_threadsafe_function);
unsafe impl Send for Context {}
unsafe impl Send for ThreadSafeFunction {}

pub unsafe extern "C" fn task_complete(
    env: napi_env,
    _js_cb: napi_value,
    ctx: *mut c_void,
    data: *mut c_void,
) {
    let result = catch_unwind(AssertUnwindSafe(|| {
        let value: Box<Result<String, String>> =
            Box::from_raw(std::mem::transmute(Box::from_raw(data)));
        match value.as_ref() {
            Ok(s) => {
                let mut result: napi_value = std::mem::zeroed();
                assert_eq!(create_string(env, &s, &mut result), napi_status::napi_ok);
                assert_eq!(
                    napi_resolve_deferred(env, ctx as napi_deferred, result),
                    napi_status::napi_ok
                );
            }
            Err(e) => {
                let js_error = create_error(env, "INTERNAL_ERROR", &e);
                assert_eq!(
                    napi_reject_deferred(env, ctx as napi_deferred, js_error),
                    napi_status::napi_ok
                );
            }
        };
    }));
    match result {
        Ok(_) => (),
        Err(panic) => {
            let msg = if let Some(string) = panic.downcast_ref::<String>() {
                format!("internal error in module: {}", string)
            } else if let Some(str) = panic.downcast_ref::<&str>() {
                format!("internal error in module: {}", str)
            } else {
                "internal error in  module".to_string()
            };
            let js_error = create_error(env, "INTERNAL_ERROR", &msg);
            napi_reject_deferred(env, ctx as napi_deferred, js_error);
        }
    }
}

pub unsafe extern "C" fn message(env: napi_env, info: napi_callback_info) -> napi_value {
    let result = catch_unwind(|| {
        let mut js_this: napi_value = std::mem::zeroed();
        let mut s = 2;
        let mut args_buffer: [napi_value; 2] = std::mem::zeroed();
        let args_ptr = args_buffer.as_mut_ptr();
        let mut promise: napi_value = std::mem::zeroed();
        let mut deferred: napi_deferred = std::mem::zeroed();
        let mut work_name: napi_value = std::mem::zeroed();
        assert_eq!(
            create_string(env, "Message Function", &mut work_name),
            napi_status::napi_ok
        );
        assert_eq!(
            napi_create_promise(env, &mut deferred, &mut promise),
            napi_status::napi_ok
        );
        assert_eq!(
            napi_get_cb_info(
                env,
                info,
                &mut s,
                args_ptr,
                &mut js_this,
                std::ptr::null_mut(),
            ),
            napi_status::napi_ok
        );
        let mut val = std::mem::zeroed();
        assert_eq!(napi_unwrap(env, js_this, &mut val), napi_status::napi_ok);
        let method = get_string(env, args_buffer[0]);
        let message = get_string(env, args_buffer[1]);
        let task = val as *mut Context;
        let mut tsfn: napi_threadsafe_function = std::ptr::null_mut();
        assert_eq!(
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
                Some(task_complete),
                &mut tsfn,
            ),
            napi_status::napi_ok
        );
        let thread_safe = ThreadSafeFunction(tsfn);
        let pool_mutex = match &POOL {
            Some(v) => v,
            None => {
                let mut undefined: napi_value = std::mem::zeroed();
                let js_error =
                    create_error(env, "INTERNAL_ERROR", "Unable to get thread for async task");
                assert_eq!(nodejs_sys::napi_throw(env, js_error), napi_status::napi_ok);
                assert_eq!(
                    napi_get_undefined(env, &mut undefined),
                    napi_status::napi_ok
                );
                return undefined;
            }
        };
        let pool = pool_mutex.lock().unwrap();
        let task = Box::from_raw(task);
        pool.execute(move || {
            let result = catch_unwind(AssertUnwindSafe(|| {
                let task = Box::into_raw(task);
                let mut inner = context!(task).inner.lock().unwrap();
                let e = inner.outward_error();
                if e.has_error() {
                    assert_eq!(
                        napi_call_threadsafe_function(
                            thread_safe.0,
                            Box::into_raw(Box::new(Result::<String, String>::Ok(String::from(
                                "context already has an error"
                            )))) as *mut c_void,
                            napi_threadsafe_function_call_mode::napi_tsfn_blocking,
                        ),
                        napi_status::napi_ok
                    );
                    return;
                };
                let (response, result) = inner.message(&method, message.as_bytes());
                let value = match result {
                    Ok(_) => {
                        let v = response.response_json.to_vec();
                        match std::str::from_utf8(&v) {
                            Ok(v) => Ok(v.to_string()),
                            Err(e) => Err(e.to_string()),
                        }
                    }
                    Err(err) => Err(err.to_string()),
                };
                assert_eq!(
                    napi_call_threadsafe_function(
                        thread_safe.0,
                        Box::into_raw(Box::new(value)) as *mut c_void,
                        napi_threadsafe_function_call_mode::napi_tsfn_blocking,
                    ),
                    napi_status::napi_ok
                );
                assert_eq!(
                    napi_release_threadsafe_function(
                        thread_safe.0,
                        napi_threadsafe_function_release_mode::napi_tsfn_release,
                    ),
                    napi_status::napi_ok,
                );
            }));
            match result {
                Ok(_) => (),
                Err(panic) => {
                    let msg = if let Some(string) = panic.downcast_ref::<String>() {
                        format!("internal error in module: {}", string)
                    } else if let Some(str) = panic.downcast_ref::<&str>() {
                        format!("internal error in module: {}", str)
                    } else {
                        "internal error in  module".to_string()
                    };
                    assert_eq!(
                        napi_call_threadsafe_function(
                            thread_safe.0,
                            Box::into_raw(Box::new(Result::<String, String>::Err(msg)))
                                as *mut c_void,
                            napi_threadsafe_function_call_mode::napi_tsfn_blocking,
                        ),
                        napi_status::napi_ok
                    );
                    assert_eq!(
                        napi_release_threadsafe_function(
                            thread_safe.0,
                            napi_threadsafe_function_release_mode::napi_tsfn_release,
                        ),
                        napi_status::napi_ok,
                    );
                }
            }
        });
        promise
    });
    handle_error!(env, result)
}

pub unsafe extern "C" fn clean(env: napi_env, info: napi_callback_info) -> napi_value {
    let result = catch_unwind(|| {
        let mut local: napi_value = std::mem::zeroed();
        assert_eq!(napi_get_undefined(env, &mut local), napi_status::napi_ok);
        let mut js_this: napi_value = std::mem::zeroed();
        let mut s = 0;
        assert_eq!(
            napi_get_cb_info(
                env,
                info,
                &mut s,
                std::ptr::null_mut(),
                &mut js_this,
                std::ptr::null_mut(),
            ),
            napi_status::napi_ok,
        );
        let mut val = std::mem::zeroed();
        assert_eq!(napi_unwrap(env, js_this, &mut val), napi_status::napi_ok);
        let task: Box<Context> = Box::from_raw(std::mem::transmute(val));
        Box::into_raw(task);
        local
    });
    handle_error!(env, result)
}

pub unsafe extern "C" fn create_class(env: napi_env, info: napi_callback_info) -> napi_value {
    let result = catch_unwind(|| {
        let mut local: napi_value = std::mem::zeroed();
        let mut s = 0;
        assert_eq!(
            napi_get_cb_info(
                env,
                info,
                &mut s,
                std::ptr::null_mut(),
                &mut local,
                std::ptr::null_mut(),
            ),
            napi_status::napi_ok
        );
        let v = match imageflow_core::Context::create_can_panic() {
            Ok(v) => v,
            Err(e) => {
                let mut undefined: napi_value = std::mem::zeroed();
                let msg = format!("Unable to create context:{}", e);
                let js_error = create_error(env, "INTERNAL_ERROR", &msg);
                assert_eq!(
                    nodejs_sys::napi_throw(env, js_error),
                    nodejs_sys::napi_status::napi_ok
                );
                assert_eq!(
                    nodejs_sys::napi_get_undefined(env, &mut undefined),
                    nodejs_sys::napi_status::napi_ok
                );
                return undefined;
            }
        };
        let inner = Context {
            inner: Mutex::new(v),
        };
        let re = Box::into_raw(Box::new(inner));
        assert_eq!(
            napi_wrap(
                env,
                local,
                re as *mut c_void,
                Some(drop_native),
                std::ptr::null_mut(),
                std::ptr::null_mut(),
            ),
            napi_status::napi_ok,
        );
        local
    });
    handle_error!(env, result)
}

pub unsafe extern "C" fn drop_native(
    _env: napi_env,
    finalize_data: *mut c_void,
    _finalize_hint: *mut c_void,
) {
    let _task: Box<Context> = Box::from_raw(std::mem::transmute(finalize_data));
}

pub struct Context {
    pub inner: Mutex<Box<imageflow_core::Context>>,
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
    let mut adj_value: i64 = std::mem::zeroed();
    assert_eq!(
        napi_adjust_external_memory(env, -1 * len, &mut adj_value),
        napi_status::napi_ok,
    );
}

#[no_mangle]
pub unsafe extern "C" fn napi_register_module_v1(
    env: napi_env,
    m: napi_value,
) -> nodejs_sys::napi_value {
    let result = catch_unwind(|| {
        POOL = Some(Mutex::new(ThreadPool::default()));
        let key_str = CString::new("Job").expect("CString::new failed");
        let mut key = std::mem::zeroed();
        assert_eq!(
            napi_create_string_utf8(env, key_str.as_ptr(), 3, &mut key),
            napi_status::napi_ok,
        );
        let mut local: napi_value = std::mem::zeroed();
        let add_input_bytes_copied_string =
            CString::new("addInputBytesCopied").expect("CString::new failed");
        let add_output_buffer_string =
            CString::new("addOutputBuffer").expect("CString::new failed");
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
        assert_eq!(
            napi_define_class(
                env,
                key_str.as_ptr(),
                3,
                Some(create_class),
                std::ptr::null_mut(),
                6,
                properties_prt,
                &mut local,
            ),
            napi_status::napi_ok
        );
        let mut get_long_version: napi_value = std::mem::zeroed();
        let get_long_version_name =
            CString::new("getLongVersionString").expect("CString::new failed");
        assert_eq!(
            napi_create_function(
                env,
                get_long_version_name.as_ptr(),
                21,
                Some(get_long_version_string),
                std::ptr::null_mut(),
                &mut get_long_version,
            ),
            napi_status::napi_ok,
        );
        let mut get_long_version_key: napi_value = std::mem::zeroed();
        assert_eq!(
            create_string(env, "getLongVersionString", &mut get_long_version_key),
            napi_status::napi_ok
        );
        assert_eq!(napi_set_property(env, m, key, local), napi_status::napi_ok);
        assert_eq!(
            napi_set_property(env, m, get_long_version_key, get_long_version),
            napi_status::napi_ok
        );
        m
    });
    handle_error!(env, result)
}
