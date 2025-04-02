## ImAround - Backend

### Routes:

* #### Post - /auth/register
```bash
{
    "username": "example",
    "email": "example@gmail.com",
    "password": "123456"
}
```
* #### Post - /auth/login

```bash
{
    "email": "example@gmail.com",
    "password": "123456"
}
```

* #### Post - /search/findUsers

```bash
{
    userIds: ["Id1", "Id2"]
}
```
* #### Get - /auth/fetchProfile

```bash
http://localhost:3000/auth/fetchProfile/{userId}
```