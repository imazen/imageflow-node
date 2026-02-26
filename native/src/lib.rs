use napi::bindgen_prelude::*;
use napi::Task;
use napi_derive::napi;
use std::sync::{Arc, Mutex};

struct ContextInner {
    ctx: Mutex<Box<imageflow_core::Context>>,
}

// Safety: Mutex serializes all access to the inner Context.
// imageflow_core::Context uses interior mutability (RefCell, raw pointers)
// but we never allow concurrent access — the Mutex guarantees exclusivity.
unsafe impl Send for ContextInner {}
unsafe impl Sync for ContextInner {}

#[napi]
pub struct Job {
    inner: Arc<ContextInner>,
}

#[napi]
impl Job {
    #[napi(constructor)]
    pub fn new() -> Result<Self> {
        let ctx = imageflow_core::Context::create_can_panic()
            .map_err(|e| Error::from_reason(format!("Unable to create context: {}", e)))?;
        Ok(Job {
            inner: Arc::new(ContextInner {
                ctx: Mutex::new(ctx),
            }),
        })
    }

    #[napi]
    pub fn add_input_bytes_copied(&self, io_id: i32, bytes: Buffer) -> Result<()> {
        let mut ctx = self
            .inner
            .ctx
            .lock()
            .map_err(|e| Error::from_reason(format!("Lock poisoned: {}", e)))?;
        ctx.add_copied_input_buffer(io_id, bytes.as_ref())
            .map_err(|e| Error::from_reason(format!("{}", e)))
    }

    #[napi]
    pub fn add_output_buffer(&self, io_id: i32) -> Result<()> {
        let mut ctx = self
            .inner
            .ctx
            .lock()
            .map_err(|e| Error::from_reason(format!("Lock poisoned: {}", e)))?;
        ctx.add_output_buffer(io_id)
            .map_err(|e| Error::from_reason(format!("{}", e)))
    }

    #[napi]
    pub fn get_output_buffer_bytes(&self, io_id: i32) -> Result<Buffer> {
        let ctx = self
            .inner
            .ctx
            .lock()
            .map_err(|e| Error::from_reason(format!("Lock poisoned: {}", e)))?;
        let slice = ctx
            .get_output_buffer_slice(io_id)
            .map_err(|e| Error::from_reason(format!("{}", e)))?;
        Ok(slice.to_vec().into())
    }

    #[napi]
    pub fn message_sync(&self, endpoint: String, json: String) -> Result<String> {
        let mut ctx = self
            .inner
            .ctx
            .lock()
            .map_err(|e| Error::from_reason(format!("Lock poisoned: {}", e)))?;
        let (response, result) = ctx.message(&endpoint, json.as_bytes());
        result.map_err(|e| Error::from_reason(format!("{}", e)))?;
        let json_bytes = response.response_json.to_vec();
        String::from_utf8(json_bytes)
            .map_err(|e| Error::from_reason(format!("Invalid UTF-8 response: {}", e)))
    }

    #[napi(ts_return_type = "Promise<string>")]
    pub fn message(&self, endpoint: String, json: String) -> AsyncTask<MessageTask> {
        AsyncTask::new(MessageTask {
            inner: self.inner.clone(),
            endpoint,
            json,
        })
    }

    #[napi]
    pub fn clean(&self) -> Result<()> {
        // Context resources are cleaned up when Job is dropped.
        // This method exists for backward compatibility.
        Ok(())
    }
}

pub struct MessageTask {
    inner: Arc<ContextInner>,
    endpoint: String,
    json: String,
}

impl Task for MessageTask {
    type Output = String;
    type JsValue = String;

    fn compute(&mut self) -> Result<Self::Output> {
        let mut ctx = self
            .inner
            .ctx
            .lock()
            .map_err(|e| Error::from_reason(format!("Lock poisoned: {}", e)))?;
        let (response, result) = ctx.message(&self.endpoint, self.json.as_bytes());
        result.map_err(|e| Error::from_reason(format!("{}", e)))?;
        let json_bytes = response.response_json.to_vec();
        String::from_utf8(json_bytes)
            .map_err(|e| Error::from_reason(format!("Invalid UTF-8 response: {}", e)))
    }

    fn resolve(&mut self, _env: Env, output: String) -> Result<Self::JsValue> {
        Ok(output)
    }
}

#[napi]
pub fn get_long_version_string() -> String {
    imageflow_types::version::one_line_version()
}
