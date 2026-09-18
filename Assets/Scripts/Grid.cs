using System.Collections;
using System.Collections.Generic;
using TMPro;
using UnityEngine;

using UnityEngine.UI;


using Newtonsoft.Json;

public class Grid : MonoBehaviour
{
    public static Grid _instance;
    private InputSystem inputSystem;
    public Tile[,] tiles;
    public int sizeOfGrid;
    public GameObject tilePrefab,piecePrefab;
    public Transform parent, pieceParrent;
    float width;
    public delegate void DelAction();
    public DelAction delAction;
    private bool canPlay;
    bool win;
    public int id = 0;
    public float lastMovedTime;
    public List<Color> colors;
    public static List<Color> staticColors;
    public TMP_Dropdown drop;
    internal static string winNum;
    public TextMeshProUGUI gameStateText,currentText,highestText;
    int score;
    int highestScore;
    public AudioSource auSource;
    public AudioClip matchSound, loseSound, winSound, elseSound;
    public Button music,retry;
    private float size;
    private RectTransform canvasRect;
    private int lastScreenW, lastScreenH;
    private bool rebuildQueued;

    [ContextMenu("Delete")]
    public void DeleteData()
    {
        PlayerPrefs.DeleteAll();
    }
    private void Awake()
    {
        _instance = this;
        canvasRect = (RectTransform)parent.GetComponentInParent<Canvas>().rootCanvas.transform;
        lastScreenW = Screen.width;
        lastScreenH = Screen.height;
        auSource =Camera.main.GetComponent<AudioSource>();
        staticColors = colors;
        inputSystem = new InputSystem();
    }
    private IEnumerator Start()
    {
        MakeUiResponsive();
        retry.onClick.AddListener(() => { StartNewGame(); });
        if (PlayerPrefs.GetString("music")=="0")
        {
            auSource.Stop();
            music.transform.GetChild(0).gameObject.SetActive(false);
            music.transform.GetChild(1).gameObject.SetActive(true);
        }
        else
        {
            music.transform.GetChild(0).gameObject.SetActive(true);
            music.transform.GetChild(1).gameObject.SetActive(false);
        }
        music.onClick.AddListener(() =>
        {
            if (PlayerPrefs.GetString("music") == "0")
            {
                auSource.Play();
                PlayerPrefs.SetString("music", "1");
                music.transform.GetChild(0).gameObject.SetActive(true);
                music.transform.GetChild(1).gameObject.SetActive(false);

            }
            else
            {
                auSource.Stop();
                PlayerPrefs.SetString("music", "0");
                music.transform.GetChild(0).gameObject.SetActive(false);
                music.transform.GetChild(1).gameObject.SetActive(true);

            }
        });
        

        drop.value = PlayerPrefs.GetInt("drop");
        winNum = drop.options[drop.value].text;

        drop.onValueChanged.AddListener(delegate { OnChange(); });
        gameStateText.gameObject.SetActive(false);

        yield return new WaitForSeconds(0.5f);
        StartNewGame(true);

    }
    

    void MakeUiResponsive()
    {
        // texts fit their rects on any screen instead of using a fixed point size
        foreach (var text in new[] { gameStateText, currentText, highestText })
        {
            text.enableAutoSizing = true;
        }
        if (drop.captionText != null)
        {
            drop.captionText.enableAutoSizing = true;
        }
        if (drop.itemText != null)
        {
            drop.itemText.enableAutoSizing = true;
        }

    }

    IEnumerator FitHeaderRows()
    {
        // wait for the layout groups and safe area to settle
        yield return null;
        Canvas.ForceUpdateCanvases();

        var safeAreaGroup = music.GetComponentInParent<VerticalLayoutGroup>();
        if (safeAreaGroup == null)
        {
            yield break;
        }
        var safeArea = (RectTransform)safeAreaGroup.transform;
        float available = safeArea.rect.width;

        // header rows have fixed design widths; scale them down on narrower screens
        foreach (RectTransform row in safeArea)
        {
            if (row.rect.width <= 0)
            {
                continue;
            }
            float scale = Mathf.Min(1f, available / row.rect.width);
            row.localScale = new Vector3(scale, scale, 1);
        }
    }

    private void Update()
    {
        // rebuild the board when resolution or orientation changes
        if (!rebuildQueued && (Screen.width != lastScreenW || Screen.height != lastScreenH))
        {
            rebuildQueued = true;
            StartCoroutine(RebuildAfterResize());
        }
    }

    IEnumerator RebuildAfterResize()
    {
        // wait until the size stops changing (e.g. window being dragged)
        int w, h;
        do
        {
            w = Screen.width;
            h = Screen.height;
            yield return new WaitForSecondsRealtime(0.25f);
        }
        while (w != Screen.width || h != Screen.height);

        lastScreenW = Screen.width;
        lastScreenH = Screen.height;
        rebuildQueued = false;
        if (tiles != null)
        {
            StartNewGame(true);
        }
    }

    private void OnChange()
    {
        //Debug.Log("Change");
        winNum = drop.options[drop.value].text;
        PlayerPrefs.SetInt("drop", drop.value);
        StartNewGame(true);
    }

    private void OnEnable()
    {
        inputSystem.Enable();
        inputSystem.PlayerActionMap.Down.started += Down;
        inputSystem.PlayerActionMap.Up.started += Up;
        inputSystem.PlayerActionMap.Left.started += Left;
        inputSystem.PlayerActionMap.Right.started += Right;
        inputSystem.PlayerActionMap.TouchPosition.started += TouchPos;

    }
      private void TouchPos(UnityEngine.InputSystem.InputAction.CallbackContext obj)
    {
        if (Time.time < lastMovedTime + 0.2f)
        {
            return;
        }
        lastMovedTime = Time.time;
        var dir = obj.ReadValue<Vector2>();
        bool hor = false, vert = false;

        if (dir.x > 0 || dir.x < 0)
        {

            hor = true;
        }
        if (dir.y > 0 || dir.y < 0)
        {
            vert = true;
        }
        if (vert && hor)
        {
            if (Mathf.Abs(dir.x)> Mathf.Abs(dir.y))
            {
                if (dir.x>0)
                {
                   Move(Vector2.right);
                }
                else
                {
                   Move(Vector2.left);
                }
            }
            else
            {
                if (dir.y > 0)
                {
                   Move(Vector2.up);
                }
                else
                {
                   Move(Vector2.down);
                }
            }
        }
        else if (vert)
        {
            if (dir.y > 0)
            {
               Move(Vector2.up);
            }
            else
            {
               Move(Vector2.down);
            }
        }
        else if (hor)
        {
            if (dir.x > 0)
            {
               Move(Vector2.right);
            }
            else
            {
               Move(Vector2.left);
            }
        }

    }

    void Move(Vector2 direction)
    {
        if (!canPlay)
        {
            return;
        }
        if (direction == Vector2.left || Vector2.down == direction)
        {
            for (int i = 0; i < tiles.GetLength(0); i++)
            {



                for (int j = 0; j < tiles.GetLength(1); j++)
                {
                    if (tiles[i, j].piece.value != 0)
                    {
                        KeepGoing(new Vector2(i, j), direction);
                        //if (newPos != new Vector2(i, j))
                        //{
                        //    oldAndNewPos.Add(new Vector2(i, j), newPos);
                        //}

                    }

                }
            }
        }
        else
        {
            for (int i = tiles.GetLength(0) - 1; i >= 0; i--)
            {



                for (int j = tiles.GetLength(1) - 1; j >= 0; j--)
                {
                    if (tiles[i, j].piece.value != 0)
                    {
                        KeepGoing(new Vector2(i, j), direction);
                        //if (newPos != new Vector2(i, j))
                        //{
                        //    oldAndNewPos.Add(new Vector2(i, j), newPos);
                        //}

                    }

                }
            }
           
           
        }
        
        //oldAndNewPos.Clear();

        if (delAction != null)
        {
            delAction();
            delAction = null;

        }
        else
        {
            canPlay = true;
        }
        
    }
    void SaveMoves()
    {
        PlayerPrefs.SetString($"moves{winNum}", JsonConvert.SerializeObject(tiles));

    }
    Tile[,] LoadMoves()
    {
        //Debug.Log(PlayerPrefs.GetString($"moves{winNum}"));
        return JsonConvert.DeserializeObject<Tile[,]>(PlayerPrefs.GetString($"moves{winNum}"));

    }
    [ContextMenu("win")]
    public void MakeWiningPosition()
    {
        Tile tile = tiles[0, 0];
        Tile tile1 = tiles[1, 0];
        var go = Instantiate(piecePrefab, pieceParrent);
        var go1 = Instantiate(piecePrefab, pieceParrent);
        tile.piece.SetPosition( go, tile.worldPosition, int.Parse(winNum) / 2);
        
        tile1.piece.SetPosition( go1, tile1.worldPosition, int.Parse(winNum)/2);
    }
    public void KeepGoing(Vector2 index, Vector2 direction)
    {
        canPlay = false;
        

        while (true)
        {
            Vector2 makeSureVector = index + direction;
            if (makeSureVector.x < 0 || makeSureVector.x > sizeOfGrid - 1 || makeSureVector.y < 0 || makeSureVector.y > sizeOfGrid - 1)
            {
                return;
            }
            if (tiles[(int)(index.x + direction.x), (int)(index.y + direction.y)].piece.value == 0)
            {


                
                Tile oldTile = tiles[(int)index.x, (int)index.y];
                index += direction;
                Tile newTile = tiles[(int)index.x, (int)index.y];
                newTile.piece.SetPosition( oldTile.piece.gameObject, newTile.worldPosition, oldTile.piece.value,animate:true);
                
                oldTile.piece.gameObject = null;
                oldTile.piece.value = 0;
                oldTile.piece.isChanged = oldTile.piece.toBeAnimated= false;
                
                if (delAction == null)
                {
                    delAction = CreateNewNumber;
                }

            }
            else if (tiles[(int)index.x, (int)index.y].piece.value == tiles[(int)(index.x + direction.x), (int)(index.y + direction.y)].piece.value)
            {
                if (tiles[(int)(index.x + direction.x), (int)(index.y + direction.y)].piece.isChanged || tiles[(int)index.x, (int)index.y].piece.isChanged)
                {
                    return;
                }
                Tile oldTile = tiles[(int)index.x, (int)index.y];
                tiles[(int)index.x, (int)index.y].piece.gameObject.name = "ss";
                DestroyImmediate(tiles[(int)index.x, (int)index.y].piece.gameObject);
                tiles[(int)index.x, (int)index.y].piece.gameObject = null;
                tiles[(int)index.x, (int)index.y].piece.value = 0;
                tiles[(int)index.x, (int)index.y].piece.toBeAnimated = tiles[(int)index.x, (int)index.y].piece.isChanged = false;
                index += direction;
                Tile newTile = tiles[(int)index.x, (int)index.y];
                bool win = newTile.piece.SetPosition(/*tiles[(int)tempIndex.x, (int)tempIndex.y].worldPosition*/);
                score += newTile.piece.value;
                auSource.PlayOneShot(matchSound);

                if (win)
                {
                    Debug.Log("You won ");
                    win = true;
                    auSource.PlayOneShot(winSound);

                    StartCoroutine(DelayStartGame("Win"));
                    return;
                }
                //newTile.piece.isChanged = true;
                if (delAction == null)
                {
                    delAction = CreateNewNumber;
                }
            }
            else
            {

                return;
            }
        }
    }

    private void Left(UnityEngine.InputSystem.InputAction.CallbackContext obj)
    {

        Move(Vector2.left);



    }

    private void Up(UnityEngine.InputSystem.InputAction.CallbackContext obj)
    {
        Move(Vector2.up);


    }


    private void Right(UnityEngine.InputSystem.InputAction.CallbackContext obj)
    {
        Move(Vector2.right);



    }

    private void Down(UnityEngine.InputSystem.InputAction.CallbackContext obj)
    {
        Move(Vector2.down);
       

    }

    public void SetScore()
    {
        currentText.text = $"{score}";
        if (highestScore<score)
        {
            PlayerPrefs.SetInt($"{drop.value}", score);
            highestScore = score;
            highestText.text = $"{score}";
        }
        
    }
       void StartNewGame(bool loadPrevGame = false)
    {
        StartCoroutine(FitHeaderRows());

        score = 0;
        highestScore = PlayerPrefs.GetInt($"{drop.value}");
        highestText.text = $"{highestScore}";   
        SetScore();
        gameStateText.gameObject.SetActive(false);
        win = false;

        canPlay = true;
        id = 0;
        if (drop.value == 0)
        {
            sizeOfGrid = 4;



        }
        else if (drop.value<=2)
        {

            sizeOfGrid = 5;
        }
        else
        {

            sizeOfGrid = 6;
        }
        // fit the board to the current canvas: full width on portrait,
        // limited by height on landscape / short screens
        Canvas.ForceUpdateCanvases();
        float boardSpan = Mathf.Min(canvasRect.rect.width * 0.95f, canvasRect.rect.height * 0.55f);
        size = boardSpan / (sizeOfGrid + 1);
        //Debug.Log(size);

         tilePrefab.GetComponent<RectTransform>().sizeDelta = new Vector2(size, size);
        piecePrefab.GetComponent<RectTransform>().sizeDelta = Vector2.one * size * 0.9f;
        if (tiles != null&&tiles != null)
        {
            foreach (var item in tiles)
            {
                if (item.gameObject != null)
                {
                    Destroy(item.gameObject);
                }
                if (item.piece.gameObject != null)
                {
                    Destroy(item.piece.gameObject);

                }
            }
        }
        tiles = new Tile[sizeOfGrid, sizeOfGrid];

        width = tilePrefab.GetComponent<RectTransform>().sizeDelta.x;
        Vector2 startx = Vector2.left * width * (sizeOfGrid - 1) / 2 + Vector2.down * (sizeOfGrid - 1) * width / 2;
        Tile[,] st = null;
        if (loadPrevGame)
        {
             st = LoadMoves();
            
            if (st == null || tiles.GetLength(0) != st.GetLength(0) || tiles.GetLength(1) != st.GetLength(1)  )
            {
                loadPrevGame = false;
                Debug.Log("saved data is not correct");
            }

        }
        for (int i = 0; i < tiles.GetLength(0); i++)
        {



            for (int j = 0; j < tiles.GetLength(1); j++)
            {

                GameObject go = Instantiate(tilePrefab, parent);
                go.GetComponent<RectTransform>().anchoredPosition = startx + i * width * Vector2.right + j * width * Vector2.up;


                tiles[i, j] = new Tile();
                tiles[i, j].gameObject = go;
                tiles[i, j].gridPosition = new Vector2(i, j);
                tiles[i, j].gameObject.name = new Vector2(i, j).ToString();
                tiles[i, j].worldPosition = go.transform.position;
                if (loadPrevGame && st[i, j].piece.value!=0)
                {
                
                    var piece = Instantiate(piecePrefab, pieceParrent);
                    //piece.GetComponent<Image>().color = Color.blue;
                    tiles[i, j].piece.SetPosition(piece, go.transform.position, st[i, j].piece.value);
                    score += st[i, j].piece.value;
                }

            }


        }
        if (!loadPrevGame)
        {
            
                CreateNewNumber();



        }
        else
        {
            auSource.PlayOneShot(elseSound);

        }

    }
    public void CreateNewNumber()
    {
        
        
        delAction = null;
        Tile tile = tiles[Random.Range(0, sizeOfGrid), Random.Range(0, sizeOfGrid)];
        if (tile.piece.gameObject != null)
        {
            CreateNewNumber();
            return;
        }
        StartCoroutine(CreateNewNumberD(tile));

    }
    IEnumerator CreateNewNumberD(Tile tile)
    {
        foreach (var item in tiles)
        {
            if (item.piece.isChanged)
            {
                item.piece.isChanged = false;
               
            }
            if (item.piece.toBeAnimated && item.piece.gameObject!= null)
            {
                item.piece.toBeAnimated = false;
                item.piece.Animate();
            }
        }

        yield return new WaitForSeconds(0.1f);

        auSource.PlayOneShot(elseSound);

        var go = Instantiate(piecePrefab, pieceParrent);
        go.GetComponent<Image>().color = Color.blue;
        tile.piece.SetPosition( go, tile.worldPosition, 2);
        SetScore();


     
       
        if (!IsGameOver())
        {

            canPlay = true;
            SaveMoves();

        }
        else
        {

            GameOver();
        }
    }
    void GameOver()
    {
        print("game over");
        auSource.PlayOneShot(loseSound);
        canPlay = false;
        StartCoroutine(DelayStartGame("Lost"));
    }
    
    IEnumerator DelayStartGame(string gameState)
    {
        gameStateText.gameObject.SetActive(true);
        gameStateText.text = $"You {gameState}";
        gameStateText.transform.localScale = new Vector3(1, 1, 1);
        iTween.ScaleTo(gameStateText.gameObject, new Vector3(2, 2, 2), 1);

        yield return new WaitForSeconds(2);
        
        StartNewGame();
    }
    bool IsGameOver()
    {
        for (int i = 0; i < tiles.GetLength(0); i++)
        {
            for (int j = 0; j < tiles.GetLength(1); j++)
            {
                if (tiles[i, j].piece.value == 0)
                {
                    i = 99;
                    return false;
                }
                else if (i + 1 < sizeOfGrid && tiles[i, j].piece.value == tiles[i + 1, j].piece.value)

                {
                    i = 99;

                    return false;
                }
                else if (i - 1 > 0 && tiles[i, j].piece.value == tiles[i - 1, j].piece.value)
                {
                    i = 99;

                    return false;
                }
                else if (j + 1 < sizeOfGrid && tiles[i, j].piece.value == tiles[i , j+1].piece.value)
                {
                    i = 99;

                    return false;
                }
                else if (j - 1 > 0 && tiles[i, j].piece.value == tiles[i , j-1].piece.value)
                {
                    i = 99;

                    return false;
                }

            }
        }
        return true;
    }
}
[System.Serializable]
public class Tile
{
    internal GameObject gameObject;
    internal Vector2 gridPosition;
    internal Vector2 worldPosition;
    [SerializeField] public Piece piece;
    public Tile()
    {
        piece = new();
    }
}
[System.Serializable]
public class Piece
{

    internal GameObject gameObject;[SerializeField] public int value;
    internal bool isChanged,toBeAnimated;
    
    internal Vector3 worldPosition;
    public void Animate()
    {

        iTween.MoveTo(gameObject, worldPosition, 0.15f);

    }
    public void SetPosition(GameObject gameObject, Vector2 worldPosition, int value, bool animate = false)
    {
       

            this.gameObject = gameObject;
        this.worldPosition = worldPosition ;

            this.toBeAnimated = animate;
        if (!animate)
        {
            gameObject.transform.position = worldPosition;
        }
       
        
       
       


        this.value = value;
        SetText();
        if (value != 0)
        {
            SetColor();
        }
    }
    public bool SetPosition()
    {

        isChanged = true;
        
        //worldPosition = gameObject.transform.position;
        value += value;

        SetText();

        SetColor();
        if (value.ToString() == Grid.winNum)
        {
            return true;
        }
        return false;
    }
    void SetText()
    {
        var text = gameObject.GetComponentInChildren<TextMeshProUGUI>();
        text.enableAutoSizing = true;
        // prefab caps auto-size at 72pt, too small for big tiles on large screens
        text.fontSizeMax = 500;
        text.text = value == 0 ? "" : value.ToString();
    }
    void SetColor()
    {
        switch (value)
        {
            case 2:
                gameObject.GetComponent<Image>().color = Grid.staticColors[0];
                break;
            case 4:
                gameObject.GetComponent<Image>().color = Grid.staticColors[1];
                break;
            case 8:
                gameObject.GetComponent<Image>().color = Grid.staticColors[2];
                break;
            case 16:
                gameObject.GetComponent<Image>().color = Grid.staticColors[3];
                break;
            case 32:
                gameObject.GetComponent<Image>().color = Grid.staticColors[4];
                break;
            case 64:
                gameObject.GetComponent<Image>().color = Grid.staticColors[5];
                break;
            case 128:
                gameObject.GetComponent<Image>().color = Grid.staticColors[6];
                break;
            case 256:
                gameObject.GetComponent<Image>().color = Grid.staticColors[7];
                break;
            case 512:
                gameObject.GetComponent<Image>().color = Grid.staticColors[8];
                break;
            case 1024:
                gameObject.GetComponent<Image>().color = Grid.staticColors[9];
                break;
            case 2048:
                gameObject.GetComponent<Image>().color = Grid.staticColors[10];
                break;
            case 4096:
                gameObject.GetComponent<Image>().color = Grid.staticColors[11];
                break;

            case 8192:
                gameObject.GetComponent<Image>().color = Grid.staticColors[12];
                break;
            case 16384:
                gameObject.GetComponent<Image>().color = Grid.staticColors[13];
                break; ;
            default:
                break;
        }
    }

}

